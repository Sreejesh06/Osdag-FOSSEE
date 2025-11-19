from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from design.models import LocationRecord, MaterialCatalog
from design.services import data_loader


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
        data_loader.clear_cached_payload()
        LocationRecord.objects.create(
            state='State A',
            district='District 1',
            basic_wind_speed=44,
            seismic_zone='III',
            seismic_factor=0.16,
            max_temp=45,
            min_temp=24,
        )
        LocationRecord.objects.create(
            state='State B',
            district='District 9',
            basic_wind_speed=50,
            seismic_zone='IV',
            seismic_factor=0.24,
            max_temp=48,
            min_temp=20,
        )
        MaterialCatalog.objects.create(category='girder_steel', grade='E250')
        MaterialCatalog.objects.create(category='girder_steel', grade='E350')
        MaterialCatalog.objects.create(category='cross_bracing_steel', grade='E250')
        MaterialCatalog.objects.create(category='deck_concrete', grade='M30')

    def test_locations_endpoint_returns_states(self):
        response = self.client.get(reverse('locations'))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['states'])

    def test_locations_lookup_returns_single_record(self):
        response = self.client.get(
            reverse('locations-lookup'),
            {'state': 'State A', 'district': 'District 1'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['seismic_zone'], 'III')

    def test_locations_lookup_handles_missing_record(self):
        response = self.client.get(
            reverse('locations-lookup'),
            {'state': 'Unknown', 'district': 'Missing'},
        )
        self.assertEqual(response.status_code, 404)

    def test_materials_endpoint_lists_grades(self):
        response = self.client.get(reverse('materials'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('E250', response.data['girder_steel'])
        self.assertIn('M30', response.data['deck_concrete'])

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
