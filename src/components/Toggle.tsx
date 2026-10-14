import React from 'react';
import './toggle.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  size?: 'sm' | 'md';
  label?: string;
  ariaLabel?: string;
  className?: string;
  title?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  id,
  name,
  size = 'md',
  label,
  ariaLabel,
  className = '',
  title,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onChange(e.target.checked);
  };

  return (
    <label
      className={`yt-toggle yt-toggle--${size} switch ${checked ? 'is-checked' : ''} ${
        disabled ? 'is-disabled' : ''
      } ${className}`}
      title={title}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || title || 'Toggle switch'}
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        className="yt-toggle-input"
      />
      <span className="yt-toggle-track slider" aria-hidden="true">
        <span className="yt-toggle-thumb"></span>
      </span>
      {label && <span className="yt-toggle-label">{label}</span>}
    </label>
  );
};
