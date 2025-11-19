from __future__ import annotations

import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from design.models import MaterialCatalog


class Command(BaseCommand):
    help = 'Load materials.csv into the MaterialCatalog table.'

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            '--csv-path',
            dest='csv_path',
            help='Optional absolute path to a CSV file. Defaults to data/materials.csv.',
        )
        parser.add_argument(
            '--truncate',
            action='store_true',
            help='Delete existing MaterialCatalog rows before ingesting.',
        )

    def handle(self, *args, **options) -> None:
        csv_path = options.get('csv_path')
        truncate = options.get('truncate')
        path = Path(csv_path) if csv_path else settings.DATA_DIR / 'materials.csv'
        if not path.exists():
            raise CommandError(f'{path} does not exist')

        if truncate:
            MaterialCatalog.objects.all().delete()

        created_count = 0
        updated_count = 0
        with path.open('r', newline='') as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                category = (row.get('category') or '').strip()
                grade = (row.get('grade') or '').strip()
                if not category or not grade:
                    continue
                _, created = MaterialCatalog.objects.update_or_create(
                    category=category,
                    grade=grade,
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Ingested {created_count} new rows and updated {updated_count} existing rows from {path}',
            )
        )
