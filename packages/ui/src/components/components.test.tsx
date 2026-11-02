import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert, Badge, Button, Checkbox, Field, Fieldset, Input, Radio } from '../index';

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

describe('Field', () => {
  it('names the control with its label and describes it with error then hint', () => {
    render(
      <Field label="Maximum hourly rate" hint="In Australian dollars" error="Enter a number">
        {(props) => <Input {...props} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Maximum hourly rate' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Error: Enter a number In Australian dollars');
  });

  it('omits aria-invalid when valid', () => {
    render(<Field label="Name">{(props) => <Input {...props} />}</Field>);
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveAttribute('aria-invalid');
  });
});

describe('Checkbox and Radio', () => {
  it('are native controls toggled through their label', async () => {
    render(
      <Fieldset legend="Languages">
        <Checkbox label="Arabic" description="Spoken fluently" />
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Languages' });
    expect(group).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: /Arabic/ });
    expect(checkbox).toHaveAccessibleDescription('Spoken fluently');
    await userEvent.click(screen.getByText('Arabic'));
    expect(checkbox).toBeChecked();
  });

  it('radios in a group are selectable with the keyboard', async () => {
    render(
      <Fieldset legend="Search radius">
        <Radio name="radius" label="5 km" defaultChecked />
        <Radio name="radius" label="10 km" />
      </Fieldset>,
    );
    screen.getByRole('radio', { name: '5 km' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: '10 km' })).toBeChecked();
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
