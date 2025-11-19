import assert from 'node:assert/strict';
import { deriveValidationHighlights } from './validation';

type HighlightInput = Parameters<typeof deriveValidationHighlights>[0];

const scenarios: Array<{ description: string; input: HighlightInput; expected: ReturnType<typeof deriveValidationHighlights> }> = [
  {
    description: 'returns no highlights when there are no invalid flags',
    input: {
      geometryErrors: {},
      invalidCarriagewayWidth: false,
      invalidSpan: false,
      invalidFootpathWidth: false,
    },
    expected: { deck: false, girders: false, footpaths: false, overhangs: false },
  },
  {
    description: 'highlights the deck and overhangs when carriageway width is invalid',
    input: {
      geometryErrors: {},
      invalidCarriagewayWidth: true,
      invalidSpan: false,
      invalidFootpathWidth: false,
    },
    expected: { deck: true, girders: false, footpaths: false, overhangs: true },
  },
  {
    description: 'highlights girders when girder spacing errors are present',
    input: {
      geometryErrors: { girder_spacing: 'Spacing invalid' },
      invalidCarriagewayWidth: false,
      invalidSpan: false,
      invalidFootpathWidth: false,
    },
    expected: { deck: false, girders: true, footpaths: false, overhangs: false },
  },
  {
    description: 'highlights footpaths when the footpath width is invalid',
    input: {
      geometryErrors: {},
      invalidCarriagewayWidth: false,
      invalidSpan: false,
      invalidFootpathWidth: true,
    },
    expected: { deck: false, girders: false, footpaths: true, overhangs: false },
  },
  {
    description: 'highlights girders when span fails validation',
    input: {
      geometryErrors: { span: 'Outside supported range' },
      invalidCarriagewayWidth: false,
      invalidSpan: false,
      invalidFootpathWidth: false,
    },
    expected: { deck: false, girders: true, footpaths: false, overhangs: false },
  },
  {
    description: 'matches tokenized deck errors when the backend returns namespaced keys',
    input: {
      geometryErrors: { deck_balance_error: 'Equation mismatch' },
      invalidCarriagewayWidth: false,
      invalidSpan: false,
      invalidFootpathWidth: false,
    },
    expected: { deck: true, girders: false, footpaths: false, overhangs: true },
  },
];

scenarios.forEach(({ description, input, expected }) => {
  const highlights = deriveValidationHighlights(input);
  assert.deepStrictEqual(highlights, expected, description);
});

console.log(`✅ ${scenarios.length} validation highlight scenarios passed.`);
