import type { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function FormSection({ title, description, disabled = false, children }: FormSectionProps) {
  return (
    <fieldset className={`section ${disabled ? 'section--disabled' : ''}`} disabled={disabled}>
      <div className="section__header">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="section__body">{children}</div>
    </fieldset>
  );
}
