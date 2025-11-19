export interface ValidationHighlightState {
  deck: boolean;
  girders: boolean;
  footpaths: boolean;
  overhangs: boolean;
}

interface HighlightInput {
  geometryErrors: Record<string, string>;
  invalidCarriagewayWidth: boolean;
  invalidSpan: boolean;
  invalidFootpathWidth: boolean;
}

const hasMatchingError = (errors: Record<string, string>, exactKeys: string[], tokenMatches: string[]) => {
  if (exactKeys.some((key) => Boolean(errors[key]))) {
    return true;
  }

  if (tokenMatches.length === 0) {
    return false;
  }

  const errorKeys = Object.keys(errors);
  return errorKeys.some((errorKey) => tokenMatches.some((token) => errorKey.includes(token)));
};

export const deriveValidationHighlights = ({
  geometryErrors,
  invalidCarriagewayWidth,
  invalidSpan,
  invalidFootpathWidth,
}: HighlightInput): ValidationHighlightState => {
  const deckInvalid =
    invalidCarriagewayWidth || hasMatchingError(geometryErrors, ['carriageway_width', 'deck_overhang', 'overall_width'], ['deck']);

  const girderInvalid =
    invalidSpan || hasMatchingError(geometryErrors, ['girder_spacing', 'girder_count', 'span'], ['girder']);

  const footpathInvalid = invalidFootpathWidth || hasMatchingError(geometryErrors, ['footpath_width'], ['footpath']);

  const overhangInvalid =
    invalidCarriagewayWidth || hasMatchingError(geometryErrors, ['deck_overhang'], ['overhang', 'deck']);

  return {
    deck: deckInvalid,
    girders: girderInvalid,
    footpaths: footpathInvalid,
    overhangs: overhangInvalid,
  };
};
