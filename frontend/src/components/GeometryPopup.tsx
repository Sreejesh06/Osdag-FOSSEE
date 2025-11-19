import type { GeometryField } from '../types';
import { PopupModal } from './PopupModal';
import { InputField } from './InputField';

interface GeometryPopupProps {
  isOpen: boolean;
  carriagewayWidth: number;
  geometry: {
    overall_width: number;
    girder_spacing: number;
    girder_count: number;
    deck_overhang: number;
  };
  errors: Record<string, string>;
  warnings: Record<string, string>;
  onChange: (field: GeometryField, value: number) => void;
  onClose: () => void;
}

export function GeometryPopup({
  isOpen,
  carriagewayWidth,
  geometry,
  errors,
  warnings,
  onChange,
  onClose,
}: GeometryPopupProps) {
  const helper =
    'Any change re-solves the constraint: overall width = (girders × spacing) + (2 × overhang). Values are rounded to 0.1 m for readability.';
  const equation = `${geometry.girder_count} × ${geometry.girder_spacing.toFixed(1)} + 2 × ${geometry.deck_overhang.toFixed(1)} = ${geometry.overall_width.toFixed(2)} m`;
  const overallNote = `Overall width = carriageway width (${carriagewayWidth.toFixed(2)} m) + 5 m`;

  return (
    <PopupModal title="Modify Additional Geometry" isOpen={isOpen} onClose={onClose} width="520px">
      <p className="muted">{helper}</p>
      <div className="equation-card">
        <strong>Width balance</strong>
        <span>{equation}</span>
        <small>{overallNote}</small>
      </div>
      <div className="grid two-col">
        <InputField
          label="Girder spacing (m)"
          type="number"
          step={0.1}
          min={0.5}
          value={geometry.girder_spacing}
          onChange={(value) => onChange('girder_spacing', Number(value))}
          error={errors.girder_spacing}
        />
        <InputField
          label="Number of girders"
          type="number"
          step={1}
          min={2}
          value={geometry.girder_count}
          onChange={(value) => onChange('girder_count', Number(value))}
          error={errors.girder_count}
        />
        <InputField
          label="Deck overhang width (m)"
          type="number"
          step={0.1}
          min={0.5}
          value={geometry.deck_overhang}
          onChange={(value) => onChange('deck_overhang', Number(value))}
          error={errors.deck_overhang}
        />
        <label className="form-control">
          <span className="form-control__label">Overall width (auto)</span>
          <input type="text" value={`${geometry.overall_width.toFixed(2)} m`} readOnly />
        </label>
      </div>
      {Object.keys(warnings).length > 0 && (
        <ul className="warning-list">
          {Object.entries(warnings).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
      )}
      <div className="modal__footer">
        <button type="button" className="primary" onClick={onClose}>
          Done
        </button>
      </div>
    </PopupModal>
  );
}
