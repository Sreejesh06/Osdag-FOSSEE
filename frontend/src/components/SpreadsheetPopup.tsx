import { useEffect, useState } from 'react';
import type { CustomLoadingValues } from '../types';
import { PopupModal } from './PopupModal';

interface SpreadsheetPopupProps {
  isOpen: boolean;
  initialValues: CustomLoadingValues;
  onSubmit: (values: CustomLoadingValues) => Promise<void>;
  onClose: () => void;
}

const DEFAULT_VALUES: CustomLoadingValues = {
  wind: 45,
  seismicZone: 'III',
  seismicFactor: 0.16,
  maxTemp: 40,
  minTemp: 20,
};

export function SpreadsheetPopup({ isOpen, initialValues, onSubmit, onClose }: SpreadsheetPopupProps) {
  const [values, setValues] = useState<CustomLoadingValues>(initialValues || DEFAULT_VALUES);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues || DEFAULT_VALUES);
      setStatus('idle');
      setMessage('');
    }
  }, [initialValues, isOpen]);

  const updateField = (field: keyof CustomLoadingValues, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [field]: field === 'seismicZone' ? nextValue : Number(nextValue),
    }));
  };

  const handleSave = async () => {
    if (values.maxTemp < values.minTemp) {
      setStatus('error');
      setMessage('Maximum temperature must be greater than minimum temperature.');
      return;
    }

    try {
      setStatus('loading');
      setMessage('');
      await onSubmit(values);
      setStatus('success');
      setMessage('Custom parameters saved successfully.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (error) {
      setStatus('error');
      setMessage('Unable to save custom parameters.');
    }
  };

  return (
    <PopupModal title="Custom Loading Spreadsheet" isOpen={isOpen} onClose={onClose} width="720px">
      <div className="spreadsheet">
        <div className="spreadsheet__table" role="table" aria-label="Loading parameters">
          <div className="spreadsheet__row spreadsheet__row--header" role="row">
            <span role="columnheader">Wind (m/s)</span>
            <span role="columnheader">Seismic Zone</span>
            <span role="columnheader">Seismic Factor</span>
            <span role="columnheader">Max Temp (°C)</span>
            <span role="columnheader">Min Temp (°C)</span>
          </div>
          <div className="spreadsheet__row" role="row">
            <input role="cell" type="number" step="0.1" value={values.wind} onChange={(e) => updateField('wind', e.target.value)} />
            <input role="cell" type="text" value={values.seismicZone} onChange={(e) => updateField('seismicZone', e.target.value.toUpperCase())} maxLength={4} />
            <input role="cell" type="number" step="0.01" value={values.seismicFactor} onChange={(e) => updateField('seismicFactor', e.target.value)} />
            <input role="cell" type="number" step="0.5" value={values.maxTemp} onChange={(e) => updateField('maxTemp', e.target.value)} />
            <input role="cell" type="number" step="0.5" value={values.minTemp} onChange={(e) => updateField('minTemp', e.target.value)} />
          </div>
        </div>
        <div className="spreadsheet__actions">
          {message && <span className={`status status--${status}`}>{message}</span>}
          <div className="spreadsheet__buttons">
            <button type="button" className="ghost" onClick={onClose} disabled={status === 'loading'}>
              Cancel
            </button>
            <button type="button" className="primary" onClick={handleSave} disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving...' : 'Save values'}
            </button>
          </div>
        </div>
      </div>
    </PopupModal>
  );
}
