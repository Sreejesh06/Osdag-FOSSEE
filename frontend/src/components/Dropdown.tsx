interface Option {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
}

export function Dropdown({ label, value, options, onChange, placeholder, disabled, helperText }: DropdownProps) {
  return (
    <label className={`form-control ${disabled ? 'is-disabled' : ''}`}>
      <span className="form-control__label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && <small className="form-control__helper">{helperText}</small>}
    </label>
  );
}
