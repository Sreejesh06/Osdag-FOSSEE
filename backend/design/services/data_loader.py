from __future__ import annotations

import csv
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from django.conf import settings
from django.db.models import QuerySet

from design.models import LocationRecord

FIELD_MAP = {
    'basic_wind_speed': 'Wind_Speed_ms',
    'seismic_zone': 'Seismic_Zone',
    'seismic_factor': 'Seismic_Factor',
    'max_temp': 'Max_Temp_C',
    'min_temp': 'Min_Temp_C',
}

def _csv_path(name: str) -> Path:
    return Path(settings.DATA_DIR / name)


def _safe_float(value: str | None) -> float | None:
    if value in (None, ''):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _first_present(row: Dict[str, Any], keys: Iterable[str], allow_blank: bool = True) -> str | None:
    for key in keys:
        if key is None:
            continue
        value = row.get(key)
        if value is None:
            continue
        if not allow_blank and value == '':
            continue
        return value
    return None


def _load_csv(name: str, field_map: Dict[str, str]) -> Dict[Tuple[str, str], Dict[str, Any]]:
    path = Path(name)
    if not path.is_absolute():
        path = _csv_path(name)
    data: Dict[Tuple[str, str], Dict[str, Any]] = {}
    if not path.exists():
        return data

    with path.open('r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            state = _first_present(row, ('state', 'State'), allow_blank=False)
            district = _first_present(row, ('district', 'District', 'city', 'City'), allow_blank=False)
            if not state or not district:
                continue
            key = (state.strip(), district.strip())
            normalized = {}
            for target, source in field_map.items():
                candidates = (source, source.lower(), source.upper())
                raw_value = _first_present(row, candidates, allow_blank=True)
                if isinstance(raw_value, str) and raw_value.strip().upper() == 'NULL':
                    normalized[target] = ''
                else:
                    normalized[target] = raw_value
            data[key] = normalized
    return data


def _serialize_queryset(queryset: QuerySet[LocationRecord]) -> Dict[str, Any]:
    if not queryset:
        raise LocationRecord.DoesNotExist('Populate LocationRecord via ingest_environment_table before serving catalog data.')

    state_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for record in queryset:
        state_map[record.state].append(
            {
                'district': record.district,
                'basic_wind_speed': record.basic_wind_speed,
                'seismic_zone': record.seismic_zone,
                'seismic_factor': record.seismic_factor,
                'max_temp': record.max_temp,
                'min_temp': record.min_temp,
            }
        )

    for districts in state_map.values():
        districts.sort(key=lambda row: row['district'])

    states = sorted(state_map.keys())
    return {'states': states, 'districts': state_map}


@lru_cache(maxsize=1)
def load_location_payload() -> Dict[str, Any]:
    queryset = LocationRecord.objects.all().order_by('state', 'district')
    return _serialize_queryset(list(queryset))


def clear_cached_payload() -> None:
    load_location_payload.cache_clear()
