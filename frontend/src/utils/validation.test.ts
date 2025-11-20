import { strict as assert } from 'assert';
import { deriveValidationHighlights } from './validation';
import { resolveGeometryChange } from './geometry';

const baseGeometry = {
  overall_width: 13.5,
  girder_spacing: 6.2,
  girder_count: 2,
  deck_overhang: 0.55,
};

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

const geometryScenarios = [
  {
    description: 'auto-adjusts spacing when girder count increases',
    run: () => {
      const result = resolveGeometryChange({
        carriagewayWidth: 8.5,
        current: baseGeometry,
        field: 'girder_count',
        value: 3,
      });
      assert.equal(result.isValid, true, 'result should be valid');
      assert.equal(result.geometry.girder_count, 3, 'girder count should update');
      assert.ok(result.geometry.girder_spacing < baseGeometry.girder_spacing, 'spacing should reduce to balance width');
      assert.equal(result.errors && Object.keys(result.errors).length, 0, 'no blocking errors expected');
    },
  },
  {
    description: 'allows deck overhang increments even when rebalancing spacing',
    run: () => {
      const result = resolveGeometryChange({
        carriagewayWidth: 8.5,
        current: baseGeometry,
        field: 'deck_overhang',
        value: baseGeometry.deck_overhang + 0.3,
      });
      assert.equal(result.isValid, true);
      assert.ok(result.geometry.deck_overhang > baseGeometry.deck_overhang, 'deck overhang should grow');
      assert.ok(result.geometry.girder_spacing < baseGeometry.girder_spacing, 'spacing should decrease to maintain equality');
    },
  },
];

geometryScenarios.forEach(({ run }) => run());

console.log(`✅ ${geometryScenarios.length} geometry rebalancing scenarios passed.`);
