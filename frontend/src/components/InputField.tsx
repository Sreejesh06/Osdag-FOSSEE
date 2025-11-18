import type { ChangeEvent } from 'react';

interface InputFieldProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  disabled?: boolean;
  error?: string;
  warning?: string;
  helperText?: string;
  name?: string;
}

export function InputField({
  label,
  value,
  type = 'text',
  onChange,
  placeholder,
  min,
  max,
  step,
  disabled,
  error,
  warning,
  helperText,
  name,
}: InputFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <label className={`form-control ${disabled ? 'is-disabled' : ''}`}>
      <span className="form-control__label">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
      {helperText && !(error || warning) && <small className="form-control__helper">{helperText}</small>}
      {error && <small className="form-control__error">{error}</small>}
      {!error && warning && <small className="form-control__warning">{warning}</small>}
    </label>
  );
}
