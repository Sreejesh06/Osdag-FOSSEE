import Select, { type StylesConfig } from 'react-select';

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
  isSearchable?: boolean;
}

const customSelectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled ? '#f5f5f5' : '#ffffff',
    borderColor: state.isFocused ? '#6b8e23' : '#dddddd',
    borderWidth: 2,
    borderRadius: 0,
    minHeight: 44,
    padding: '2px 8px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(107, 142, 35, 0.15)' : 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      borderColor: '#6b8e23',
    },
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 4px',
  }),
  input: (base) => ({
    ...base,
    color: '#333333',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#999999',
    fontSize: '14px',
    fontWeight: 500,
  }),
  singleValue: (base) => ({
    ...base,
    color: '#333333',
    fontSize: '14px',
    fontWeight: 500,
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '2px solid #e0e0e0',
    overflow: 'hidden',
    marginTop: 4,
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 220,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#6b8e23' : state.isFocused ? '#f0f7e6' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#333333',
    padding: '12px 16px',
    cursor: 'pointer',
    borderRadius: 0,
    fontWeight: state.isSelected ? 600 : 500,
    transition: 'background-color 0.15s ease, color 0.15s ease',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: '#6b8e23',
    transition: 'transform 0.2s ease',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }),
  indicatorsContainer: (base, state) => ({
    ...base,
    color: state.isDisabled ? '#999999' : '#6b8e23',
  }),
};

export function Dropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  helperText,
  isSearchable = true,
}: DropdownProps) {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <label className={`form-control ${disabled ? 'is-disabled' : ''}`}>
      <span className="form-control__label">{label}</span>
      <Select
        classNamePrefix="osdag-select"
        value={selectedOption}
        options={options}
        onChange={(option) => onChange(option?.value ?? '')}
        placeholder={placeholder}
        isDisabled={disabled}
        isSearchable={isSearchable}
        styles={customSelectStyles}
      />
      {helperText && <small className="form-control__helper">{helperText}</small>}
    </label>
  );
}
