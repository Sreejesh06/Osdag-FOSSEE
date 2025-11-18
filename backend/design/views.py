from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CustomLoadingSerializer, GeometryValidationSerializer
from .services import data_loader, geometry


class LocationDataView(APIView):
    def get(self, request):
        payload = data_loader.load_location_payload()
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
        materials = {
            'girder_steel': ['E250', 'E350', 'E450'],
            'cross_bracing_steel': ['E250', 'E350', 'E450'],
            'deck_concrete': [f'M{grade}' for grade in range(25, 65, 5)],
        }
        return Response(materials)


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
