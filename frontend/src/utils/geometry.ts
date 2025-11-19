import type { GeometryResponsePayload, GeometryField } from '../types';

const MIN_OVERHANG = 0.5;
const MIN_SPACING = 0.5;
const MIN_GIRDER_COUNT = 2;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;
const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

const computeOverallWidth = (carriagewayWidth: number) => {
  const minimumWidth = MIN_SPACING * 2 + MIN_OVERHANG * 2;
  return Math.max(roundToTwoDecimals(carriagewayWidth + 5), minimumWidth);
};

const computeMaxGirders = (overallWidth: number) => {
  return Math.max(MIN_GIRDER_COUNT, Math.floor((overallWidth - 2 * MIN_OVERHANG) / MIN_SPACING));
};

const computeMaxOverhang = (overallWidth: number, girderCount: number) => {
  return Math.max(MIN_OVERHANG, (overallWidth - girderCount * MIN_SPACING) / 2);
};

const usableWidth = (overallWidth: number, overhang: number, girderCount: number) => {
  return Math.max(overallWidth - 2 * overhang, MIN_SPACING * girderCount);
};

export const detectGeometryIssues = (
  carriagewayWidth: number,
  geometry: GeometryResponsePayload['geometry'],
) => {
  const overallWidth = computeOverallWidth(carriagewayWidth);
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (geometry.girder_count < MIN_GIRDER_COUNT) {
    errors.girder_count = 'At least two girders are required.';
  }

  if (geometry.girder_spacing <= 0) {
    errors.girder_spacing = 'Girder spacing must be greater than zero.';
  }

  if (geometry.deck_overhang * 2 >= overallWidth) {
    errors.deck_overhang = 'Deck overhang must leave room for the girder bay.';
  }

  const effectiveWidth = overallWidth - 2 * geometry.deck_overhang;
  if (geometry.girder_spacing >= effectiveWidth && !errors.girder_spacing) {
    errors.girder_spacing = 'Girder spacing must be less than the usable deck width.';
  }

  if (effectiveWidth <= 0) {
    errors.deck_overhang = 'Deck overhang consumes the deck width.';
  } else if (geometry.girder_spacing > 0) {
    const computedGirders = effectiveWidth / geometry.girder_spacing;
    if (computedGirders <= 0) {
      errors.girder_spacing = 'Spacing must allow for at least one girder bay.';
    } else if (Math.abs(computedGirders - geometry.girder_count) >= 0.5 && !errors.girder_spacing) {
      warnings.girder_spacing = 'Inputs will rebalance to satisfy the width equation.';
    }
  }

  const composedWidth = geometry.girder_count * geometry.girder_spacing + 2 * geometry.deck_overhang;
  if (Math.abs(composedWidth - overallWidth) >= 0.5) {
    warnings.deck_overhang = 'Values will be rebalanced to satisfy overall width = girders × spacing + 2 × overhang.';
  }

  return { errors, warnings, overallWidth };
};

interface AutoAdjustOptions {
  carriagewayWidth: number;
  geometry: GeometryResponsePayload['geometry'];
  changedField: GeometryField | null;
}

export const autoAdjustGeometry = ({
  carriagewayWidth,
  geometry,
  changedField,
}: AutoAdjustOptions): GeometryResponsePayload['geometry'] => {
  const overallWidth = computeOverallWidth(carriagewayWidth);
  let girderCount = Math.max(MIN_GIRDER_COUNT, Math.round(geometry.girder_count));
  const maxGirders = computeMaxGirders(overallWidth);
  girderCount = Math.min(girderCount, maxGirders);

  let girderSpacing = Math.max(MIN_SPACING, geometry.girder_spacing);
  let deckOverhang = geometry.deck_overhang;

  let maxOverhang = computeMaxOverhang(overallWidth, girderCount);
  deckOverhang = clamp(deckOverhang, MIN_OVERHANG, maxOverhang);

  if (changedField === 'girder_spacing') {
    const numerator = usableWidth(overallWidth, deckOverhang, girderCount);
    girderCount = Math.max(MIN_GIRDER_COUNT, Math.min(maxGirders, Math.round(numerator / girderSpacing)));
    maxOverhang = computeMaxOverhang(overallWidth, girderCount);
    deckOverhang = clamp(deckOverhang, MIN_OVERHANG, maxOverhang);
    girderSpacing = usableWidth(overallWidth, deckOverhang, girderCount) / girderCount;
  } else if (changedField === 'girder_count' || changedField === 'deck_overhang') {
    maxOverhang = computeMaxOverhang(overallWidth, girderCount);
    deckOverhang = clamp(deckOverhang, MIN_OVERHANG, maxOverhang);
    girderSpacing = usableWidth(overallWidth, deckOverhang, girderCount) / girderCount;
  }

  const preliminaryOverhang = (overallWidth - girderCount * girderSpacing) / 2;
  maxOverhang = computeMaxOverhang(overallWidth, girderCount);
  deckOverhang = clamp(preliminaryOverhang, MIN_OVERHANG, maxOverhang);
  girderSpacing = usableWidth(overallWidth, deckOverhang, girderCount) / girderCount;

  girderSpacing = Math.max(MIN_SPACING, girderSpacing);
  girderSpacing = roundToOneDecimal(girderSpacing);
  maxOverhang = computeMaxOverhang(overallWidth, girderCount);
  deckOverhang = roundToOneDecimal(clamp((overallWidth - girderCount * girderSpacing) / 2, MIN_OVERHANG, maxOverhang));

  const residual = Math.max(overallWidth - girderCount * girderSpacing, 0);
  deckOverhang = roundToOneDecimal(clamp(residual / 2, MIN_OVERHANG, maxOverhang));

  return {
    overall_width: roundToTwoDecimals(overallWidth),
    girder_spacing: girderSpacing,
    girder_count: girderCount,
    deck_overhang: deckOverhang,
  };
};

interface ResolveGeometryOptions {
  carriagewayWidth: number;
  current: GeometryResponsePayload['geometry'];
  field: GeometryField;
  value: number;
}

export const resolveGeometryChange = ({
  carriagewayWidth,
  current,
  field,
  value,
}: ResolveGeometryOptions) => {
  const sanitized = Number.isFinite(value) ? value : 0;
  const nextValue = field === 'girder_count' ? Math.round(sanitized) : roundToOneDecimal(sanitized);
  const rawGeometry: GeometryResponsePayload['geometry'] = {
    ...current,
    overall_width: computeOverallWidth(carriagewayWidth),
    [field]: nextValue,
  };

  const { errors: rawErrors, warnings: rawWarnings } = detectGeometryIssues(carriagewayWidth, rawGeometry);

  const adjusted = autoAdjustGeometry({
    carriagewayWidth,
    geometry: rawGeometry,
    changedField: field,
  });

  const { errors: adjustedErrors, warnings: adjustedWarnings } = detectGeometryIssues(carriagewayWidth, adjusted);

  if (Object.keys(adjustedErrors).length > 0) {
    return {
      geometry: current,
      errors: adjustedErrors,
      warnings: { ...rawWarnings, ...adjustedWarnings },
      raw: rawGeometry,
      isValid: false,
    };
  }

  return {
    geometry: adjusted,
    errors: {},
    warnings: { ...rawWarnings, ...adjustedWarnings },
    raw: rawGeometry,
    isValid: true,
  };
};
