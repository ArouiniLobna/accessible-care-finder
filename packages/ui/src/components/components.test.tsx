import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert, Badge, Button } from '../index';

describe('Button', () => {
  it('is a native button that never submits by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('stays focusable but inert while busy', async () => {
    const onClick = vi.fn();
    render(
      <Button busy busyLabel="Confirming…" onClick={onClick}>
        Confirm
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Confirming…' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Alert and Badge', () => {
  it('prefixes tone in text so it is not conveyed by colour alone', () => {
    render(<Alert tone="danger" title="We couldn't update your matches" />);
    expect(
      screen.getByRole('heading', { name: "Problem: We couldn't update your matches" }),
    ).toBeInTheDocument();
  });

  it('is not a live region unless asked', () => {
    const { rerender } = render(<Alert tone="info" title="Static" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<Alert tone="info" title="Live" live="polite" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('badge text carries the meaning and icons are hidden', () => {
    const { container } = render(
      <Badge tone="success" withIcon>
        Available
      </Badge>,
    );
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
