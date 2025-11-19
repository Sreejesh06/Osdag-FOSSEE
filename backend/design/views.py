from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LocationRecord, MaterialCatalog
from .serializers import CustomLoadingSerializer, GeometryValidationSerializer
from .services import data_loader, geometry


class LocationDataView(APIView):
    def get(self, request):
        try:
            payload = data_loader.load_location_payload()
        except ObjectDoesNotExist as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload)


class LocationLookupView(APIView):
    def get(self, request):
        state_name = request.query_params.get('state')
        district_name = request.query_params.get('district')
        if not state_name or not district_name:
            return Response({'detail': 'state and district query parameters are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            record = LocationRecord.objects.get(state__iexact=state_name.strip(), district__iexact=district_name.strip())
        except LocationRecord.DoesNotExist:
            return Response({'detail': 'Location not found.'}, status=status.HTTP_404_NOT_FOUND)

        payload = {
            'state': record.state,
            'district': record.district,
            'basic_wind_speed': record.basic_wind_speed,
            'seismic_zone': record.seismic_zone,
            'seismic_factor': record.seismic_factor,
            'max_temp': record.max_temp,
            'min_temp': record.min_temp,
        }
        return Response(payload)


class CustomLoadingView(APIView):
    def post(self, request):
        serializer = CustomLoadingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {
                'message': 'Custom loading parameters captured successfully.',
                'values': serializer.validated_data,
            },
            status=status.HTTP_200_OK,
        )


class MaterialsView(APIView):
    def get(self, request):
        qs = MaterialCatalog.objects.all()
        if not qs.exists():
            return Response({'detail': 'Material catalog not loaded.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload = {'girder_steel': [], 'cross_bracing_steel': [], 'deck_concrete': []}
        for record in qs:
            payload[record.category].append(record.grade)
        return Response(payload)


class GeometryValidationView(APIView):
    def post(self, request):
        serializer = GeometryValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        errors, warnings = geometry.validate_basic_range(
            span=data['span'],
            carriageway_width=data['carriageway_width'],
            skew_angle=data['skew_angle'],
        )

        constraint_errors, constraint_warnings = geometry.detect_geometry_issues(
            carriageway_width=data['carriageway_width'],
            girder_spacing=data['girder_spacing'],
            girder_count=data['girder_count'],
            deck_overhang=data['deck_overhang'],
        )
        errors.update(constraint_errors)
        for key, value in constraint_warnings.items():
            warnings.setdefault(key, value)

        adjusted = geometry.auto_adjust_geometry(
            carriageway_width=data['carriageway_width'],
            girder_spacing=data['girder_spacing'],
            girder_count=data['girder_count'],
            deck_overhang=data['deck_overhang'],
            changed_field=data.get('changed_field'),
        )

        response = {
            'errors': errors,
            'warnings': warnings,
            'geometry': adjusted,
            'is_valid': not errors,
        }
        status_code = status.HTTP_200_OK if not errors else status.HTTP_400_BAD_REQUEST
        return Response(response, status=status_code)
