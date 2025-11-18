from __future__ import annotations

import csv
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Tuple

from django.conf import settings

FALLBACK_LOCATIONS = [
    {
        'state': 'Maharashtra',
        'district': 'Mumbai',
        'basic_wind_speed': 50,
        'seismic_zone': 'III',
        'seismic_factor': 0.16,
        'max_temp': 36,
        'min_temp': 18,
    },
    {
        'state': 'Karnataka',
        'district': 'Bengaluru',
        'basic_wind_speed': 39,
        'seismic_zone': 'II',
        'seismic_factor': 0.10,
        'max_temp': 33,
        'min_temp': 15,
    },
    {
        'state': 'Gujarat',
        'district': 'Ahmedabad',
        'basic_wind_speed': 47,
        'seismic_zone': 'IV',
        'seismic_factor': 0.24,
        'max_temp': 43,
        'min_temp': 10,
    },
    {
        'state': 'Tamil Nadu',
        'district': 'Chennai',
        'basic_wind_speed': 55,
        'seismic_zone': 'III',
        'seismic_factor': 0.16,
        'max_temp': 38,
        'min_temp': 22,
    },
    {
        'state': 'Kerala',
        'district': 'Kochi',
        'basic_wind_speed': 42,
        'seismic_zone': 'III',
        'seismic_factor': 0.16,
        'max_temp': 34,
        'min_temp': 20,
    },
]


def _csv_path(name: str) -> Path:
    return Path(settings.DATA_DIR / name)


def _safe_float(value: str | None) -> float | None:
    if value in (None, ''):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _load_csv(name: str, field_map: Dict[str, str]) -> Dict[Tuple[str, str], Dict[str, Any]]:
    path = _csv_path(name)
    data: Dict[Tuple[str, str], Dict[str, Any]] = {}
    if not path.exists():
        return data

    with path.open('r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            state = row.get('state')
            district = row.get('district')
            if not state or not district:
                continue
            key = (state.strip(), district.strip())
            normalized = {}
            for target, source in field_map.items():
                normalized[target] = row.get(source)
            data[key] = normalized
    return data


@lru_cache(maxsize=1)
def load_location_payload() -> Dict[str, Any]:
    wind = _load_csv('wind_table.csv', {'basic_wind_speed': 'basic_wind_speed'})
    seismic = _load_csv('seismic_table.csv', {'seismic_zone': 'seismic_zone', 'seismic_factor': 'seismic_factor'})
    temperature = _load_csv('temperature_table.csv', {'max_temp': 'max_temp', 'min_temp': 'min_temp'})

    combined: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for dataset in (wind, seismic, temperature):
        for key, values in dataset.items():
            combined.setdefault(key, {})
            combined[key].update(values)

    if not combined:
        combined = { (entry['state'], entry['district']): entry for entry in FALLBACK_LOCATIONS }

    state_map: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for (state, district), values in combined.items():
        payload = {
            'district': district,
            'basic_wind_speed': _safe_float(values.get('basic_wind_speed')),
            'seismic_zone': values.get('seismic_zone', ''),
            'seismic_factor': _safe_float(values.get('seismic_factor')),
            'max_temp': _safe_float(values.get('max_temp')),
            'min_temp': _safe_float(values.get('min_temp')),
        }
        state_map[state].append(payload)

    for districts in state_map.values():
        districts.sort(key=lambda row: row['district'])

    states = sorted(state_map.keys())
    return {
        'states': states,
        'districts': state_map,
    }
