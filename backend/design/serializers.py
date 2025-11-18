from rest_framework import serializers


class CustomLoadingSerializer(serializers.Serializer):
    wind = serializers.FloatField(min_value=0)
    seismic_zone = serializers.CharField(max_length=5)
    seismic_factor = serializers.FloatField(min_value=0)
    max_temp = serializers.FloatField()
    min_temp = serializers.FloatField()

    def validate(self, attrs):
        if attrs['max_temp'] < attrs['min_temp']:
            raise serializers.ValidationError('Maximum temperature must be greater than minimum temperature.')
        return attrs


class GeometryValidationSerializer(serializers.Serializer):
    span = serializers.FloatField(min_value=0)
    carriageway_width = serializers.FloatField(min_value=0)
    skew_angle = serializers.FloatField()
    girder_spacing = serializers.FloatField(min_value=0)
    girder_count = serializers.IntegerField(min_value=1)
    deck_overhang = serializers.FloatField(min_value=0)
    changed_field = serializers.ChoiceField(
        choices=['girder_spacing', 'girder_count', 'deck_overhang'],
        required=False,
        allow_null=True,
        allow_blank=True,
    )
