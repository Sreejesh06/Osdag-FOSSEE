from __future__ import annotations

from typing import Any, Dict, Tuple

from django.core.management.base import BaseCommand, CommandError

from design.models import LocationRecord
from design.services import data_loader


class Command(BaseCommand):
    help = 'Load environment_table.csv into the LocationRecord table.'

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            '--csv-path',
            dest='csv_path',
            help='Optional absolute path to a CSV file. Defaults to data/environment_table.csv.',
        )
        parser.add_argument(
            '--truncate',
            action='store_true',
            help='Delete existing LocationRecord rows before ingesting.',
        )

    def handle(self, *args, **options) -> None:
        csv_path = options.get('csv_path') or 'environment_table.csv'
        truncate = options.get('truncate')

        rows: Dict[Tuple[str, str], Dict[str, Any]] = data_loader._load_csv(csv_path, data_loader.FIELD_MAP)
        if not rows:
            raise CommandError('No rows were read from the CSV. Check the file path and headers.')

        if truncate:
            LocationRecord.objects.all().delete()

        created_count = 0
        updated_count = 0
        for (state, district), values in rows.items():
            defaults = {
                'basic_wind_speed': data_loader._safe_float(values.get('basic_wind_speed')),
                'seismic_zone': (values.get('seismic_zone') or '').strip(),
                'seismic_factor': data_loader._safe_float(values.get('seismic_factor')),
                'max_temp': data_loader._safe_float(values.get('max_temp')),
                'min_temp': data_loader._safe_float(values.get('min_temp')),
            }
            _, created = LocationRecord.objects.update_or_create(
                state=state.strip(),
                district=district.strip(),
                defaults=defaults,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        data_loader.clear_cached_payload()
        self.stdout.write(
            self.style.SUCCESS(
                f'Ingested {created_count} new rows and updated {updated_count} existing rows from {csv_path}.',
            )
        )
