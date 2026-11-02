import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider, AnnouncerRegion, useAnnouncer } from './announcer';

function Trigger({ message }: { message: string }) {
  const { announce } = useAnnouncer();
  return (
    <button type="button" onClick={() => announce(message)}>
      Announce
    </button>
  );
}

function setup(message = '18 support workers found') {
  render(
    <AnnouncerProvider>
      <Trigger message={message} />
      <AnnouncerRegion />
    </AnnouncerProvider>,
  );
  return {
    region: screen.getByRole('status'),
    announce: () => fireEvent.click(screen.getByRole('button', { name: 'Announce' })),
  };
}

describe('announcer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is present and empty before anything is announced', () => {
    const { region } = setup();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('announces after a short gap, without moving focus', () => {
    const { region, announce } = setup();
    const button = screen.getByRole('button', { name: 'Announce' });
    button.focus();
    announce();
    act(() => vi.advanceTimersByTime(100));
    expect(region).toHaveTextContent('18 support workers found');
    expect(button).toHaveFocus();
  });

  it('drops an identical message repeated within 3 seconds', () => {
    const { region, announce } = setup();
    announce();
    act(() => vi.advanceTimersByTime(100));
    announce(); // a background refetch producing the same sentence
    expect(region).toHaveTextContent('18 support workers found'); // not cleared, so not re-announced
  });

  it('re-announces the same message after 3 seconds, clearing the region first', () => {
    const { region, announce } = setup();
    announce();
    act(() => vi.advanceTimersByTime(3_100));
    announce();
    expect(region).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(100));
    expect(region).toHaveTextContent('18 support workers found');
  });
});
