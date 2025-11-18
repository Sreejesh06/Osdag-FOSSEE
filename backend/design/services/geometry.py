from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

MIN_SPAN = 20
MAX_SPAN = 45
MIN_CARRIAGEWAY = 4.25
MAX_CARRIAGEWAY = 24
SKEW_LIMIT = 15
MIN_OVERHANG = 0.5
MIN_SPACING = 0.5


@dataclass
class GeometryResult:
    values: Dict[str, float]
    errors: Dict[str, str]
    warnings: Dict[str, str]


def validate_basic_range(span: float, carriageway_width: float, skew_angle: float) -> Tuple[Dict[str, str], Dict[str, str]]:
    errors: Dict[str, str] = {}
    warnings: Dict[str, str] = {}

    if not (MIN_SPAN <= span <= MAX_SPAN):
        errors['span'] = 'Outside the software range (20 m to 45 m).'

    if not (MIN_CARRIAGEWAY <= carriageway_width < MAX_CARRIAGEWAY):
        errors['carriageway_width'] = 'Carriageway width must be within 4.25 m to 24 m.'

    if abs(skew_angle) > SKEW_LIMIT:
        warnings['skew_angle'] = 'IRC 24 (2010) requires detailed analysis for skew angles beyond ±15°.'

    return errors, warnings


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def _overall_width(carriageway_width: float) -> float:
    """Ensure the derived overall width always has room for two overhangs and girders."""

    minimum_width = MIN_SPACING * 2 + MIN_OVERHANG * 2
    return max(carriageway_width + 5.0, minimum_width)


def detect_geometry_issues(
    carriageway_width: float,
    girder_spacing: float,
    girder_count: int,
    deck_overhang: float,
) -> Tuple[Dict[str, str], Dict[str, str]]:
    overall_width = _overall_width(carriageway_width)
    errors: Dict[str, str] = {}
    warnings: Dict[str, str] = {}

    if girder_count < 2:
        errors['girder_count'] = 'At least two girders are required.'

    if girder_spacing <= 0:
        errors['girder_spacing'] = 'Girder spacing must be greater than zero.'

    if deck_overhang * 2 >= overall_width:
        errors['deck_overhang'] = 'Deck overhang must leave room for the girder bay.'

    effective_width = overall_width - 2 * deck_overhang
    if girder_spacing >= effective_width and 'girder_spacing' not in errors:
        errors['girder_spacing'] = 'Girder spacing must be less than the usable deck width.'

    if effective_width <= 0:
        errors['deck_overhang'] = 'Deck overhang consumes the deck width.'
    elif girder_spacing > 0:
        computed_girders = effective_width / girder_spacing
        if computed_girders <= 0:
            errors['girder_spacing'] = 'Spacing must allow for at least one girder bay.'
        elif abs(computed_girders - girder_count) >= 0.5 and 'girder_spacing' not in errors:
            warnings['girder_spacing'] = (
                'Inputs were auto-balanced so that overall width = girders × spacing + 2 × overhang.'
            )

    composed_width = girder_count * girder_spacing + 2 * deck_overhang
    if abs(composed_width - overall_width) >= 0.5:
        warnings.setdefault('deck_overhang', 'Values are being rebalanced to satisfy the width equation.')

    return errors, warnings


def auto_adjust_geometry(
    carriageway_width: float,
    girder_spacing: float,
    girder_count: int,
    deck_overhang: float,
    changed_field: str | None,
) -> Dict[str, float]:
    overall_width = _overall_width(carriageway_width)
    girder_count = max(2, int(round(girder_count)))

    max_girders = max(2, int((overall_width - 2 * MIN_OVERHANG) / MIN_SPACING))
    girder_count = min(girder_count, max_girders)

    girder_spacing = max(MIN_SPACING, girder_spacing)

    def compute_max_overhang(count: int) -> float:
        return max(MIN_OVERHANG, (overall_width - count * MIN_SPACING) / 2)

    def usable_width(current_overhang: float, count: int) -> float:
        return max(overall_width - 2 * current_overhang, MIN_SPACING * count)

    max_overhang = compute_max_overhang(girder_count)
    deck_overhang = _clamp(deck_overhang, MIN_OVERHANG, max_overhang)

    if changed_field == 'girder_spacing':
        numerator = usable_width(deck_overhang, girder_count)
        girder_count = max(2, min(max_girders, round(numerator / girder_spacing)))
        max_overhang = compute_max_overhang(girder_count)
        deck_overhang = _clamp(deck_overhang, MIN_OVERHANG, max_overhang)
        girder_spacing = usable_width(deck_overhang, girder_count) / girder_count
    elif changed_field in {'girder_count', 'deck_overhang'}:
        max_overhang = compute_max_overhang(girder_count)
        deck_overhang = _clamp(deck_overhang, MIN_OVERHANG, max_overhang)
        girder_spacing = usable_width(deck_overhang, girder_count) / girder_count

    # Solve deck overhang from the spacing/count pair to enforce the equation.
    preliminary_overhang = (overall_width - girder_count * girder_spacing) / 2
    max_overhang = compute_max_overhang(girder_count)
    deck_overhang = _clamp(preliminary_overhang, MIN_OVERHANG, max_overhang)
    girder_spacing = usable_width(deck_overhang, girder_count) / girder_count

    girder_spacing = max(MIN_SPACING, girder_spacing)

    girder_spacing = round(girder_spacing, 1)
    max_overhang = compute_max_overhang(girder_count)
    deck_overhang = round(_clamp((overall_width - girder_count * girder_spacing) / 2, MIN_OVERHANG, max_overhang), 1)

    # Recompute once more after rounding to keep the relationship tight.
    residual = max(overall_width - girder_count * girder_spacing, 0)
    deck_overhang = round(_clamp(residual / 2, MIN_OVERHANG, max_overhang), 1)

    return {
        'overall_width': round(overall_width, 2),
        'girder_spacing': girder_spacing,
        'girder_count': girder_count,
        'deck_overhang': deck_overhang,
    }
