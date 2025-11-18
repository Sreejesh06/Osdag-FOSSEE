from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient


class GeometryEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.valid_payload = {
            'span': 30,
            'carriageway_width': 8.5,
            'skew_angle': 0,
            'girder_spacing': 2.5,
            'girder_count': 4,
            'deck_overhang': 1.75,
        }

    def test_geometry_validation_rejects_invalid_span(self):
        payload = {**self.valid_payload, 'span': 10}
        response = self.client.post(reverse('geometry-validate'), payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('span', response.data['errors'])

    def test_geometry_validation_detects_spacing_errors(self):
        payload = {**self.valid_payload, 'girder_spacing': 30}
        response = self.client.post(reverse('geometry-validate'), payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('girder_spacing', response.data['errors'])

    def test_geometry_validation_returns_adjusted_values(self):
        payload = {**self.valid_payload, 'girder_spacing': 2.2, 'changed_field': 'girder_spacing'}
        response = self.client.post(reverse('geometry-validate'), payload, format='json')
        self.assertEqual(response.status_code, 200)
        geometry = response.data['geometry']
        overall = geometry['overall_width']
        effective_width = overall - 2 * geometry['deck_overhang']
        self.assertGreater(effective_width, 0)
        self.assertAlmostEqual(effective_width / geometry['girder_spacing'], geometry['girder_count'], places=1)


class ReferenceDataEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_locations_endpoint_returns_states(self):
        response = self.client.get(reverse('locations'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['states'])

    def test_materials_endpoint_lists_grades(self):
        response = self.client.get(reverse('materials'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('E250', response.data['girder_steel'])

    def test_custom_loading_endpoint_validates_temperatures(self):
        payload = {
            'wind': 45,
            'seismic_zone': 'III',
            'seismic_factor': 0.16,
            'max_temp': 40,
            'min_temp': 28,
        }
        response = self.client.post(reverse('custom-loading'), payload, format='json')
        self.assertEqual(response.status_code, 200)
