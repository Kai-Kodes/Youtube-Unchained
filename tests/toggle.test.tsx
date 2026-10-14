import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Toggle } from '../src/components/Toggle';

describe('Toggle Component', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders correctly in unchecked state', () => {
    act(() => {
      root.render(<Toggle checked={false} onChange={() => {}} ariaLabel="Test Toggle" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.checked).toBe(false);
    expect(input.getAttribute('role')).toBe('switch');
    expect(input.getAttribute('aria-checked')).toBe('false');
    expect(input.getAttribute('aria-label')).toBe('Test Toggle');

    const toggleLabel = container.querySelector('.yt-toggle') as HTMLLabelElement;
    expect(toggleLabel.classList.contains('is-checked')).toBe(false);
  });

  it('renders correctly in checked state', () => {
    act(() => {
      root.render(<Toggle checked={true} onChange={() => {}} ariaLabel="Checked Toggle" />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.checked).toBe(true);
    expect(input.getAttribute('aria-checked')).toBe('true');

    const toggleLabel = container.querySelector('.yt-toggle') as HTMLLabelElement;
    expect(toggleLabel.classList.contains('is-checked')).toBe(true);
  });

  it('renders small and medium variants', () => {
    act(() => {
      root.render(
        <div>
          <Toggle size="sm" checked={false} onChange={() => {}} />
          <Toggle size="md" checked={true} onChange={() => {}} />
        </div>
      );
    });

    const smToggle = container.querySelector('.yt-toggle--sm');
    const mdToggle = container.querySelector('.yt-toggle--md');
    expect(smToggle).not.toBeNull();
    expect(mdToggle).not.toBeNull();
  });

  it('invokes onChange with true when clicked from unchecked state', () => {
    const handleChange = vi.fn();

    act(() => {
      root.render(<Toggle checked={false} onChange={handleChange} />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    act(() => {
      input.click();
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('invokes onChange with false when clicked from checked state', () => {
    const handleChange = vi.fn();

    act(() => {
      root.render(<Toggle checked={true} onChange={handleChange} />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    act(() => {
      input.click();
    });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('does not invoke onChange when disabled', () => {
    const handleChange = vi.fn();

    act(() => {
      root.render(<Toggle checked={false} disabled={true} onChange={handleChange} />);
    });

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);

    const toggleLabel = container.querySelector('.yt-toggle') as HTMLLabelElement;
    expect(toggleLabel.classList.contains('is-disabled')).toBe(true);

    act(() => {
      input.click();
    });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('preserves backwards-compatible .slider and .switch class names', () => {
    act(() => {
      root.render(<Toggle checked={true} onChange={() => {}} />);
    });

    const switchLabel = container.querySelector('label.switch');
    const sliderSpan = container.querySelector('span.slider');

    expect(switchLabel).not.toBeNull();
    expect(sliderSpan).not.toBeNull();
  });
});
