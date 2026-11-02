import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '../model/search-criteria';
import { SearchFilters } from './SearchFilters';

const services = [
  { id: 'personal-care', name: 'Personal care' },
  { id: 'meal-preparation', name: 'Meal preparation' },
  { id: 'community-access', name: 'Community access' },
];
const languages = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
];

function setup() {
  const onChange = vi.fn();
  render(
    <SearchFilters
      filters={DEFAULT_FILTERS}
      onChange={onChange}
      onClearOptional={() => undefined}
      services={services}
      languages={languages}
      sessionServiceIds={['personal-care', 'meal-preparation']}
    />,
  );
  return { onChange };
}

function mockNarrowScreen() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('SearchFilters', () => {
  it('groups controls under named fieldsets with the session services pre-selected', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Search radius' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '10 km' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Personal care' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Personal care' })).toHaveAccessibleDescription(
      'Part of your session',
    );
    expect(screen.getByRole('checkbox', { name: 'Community access' })).not.toBeChecked();
  });

  it('applies discrete choices immediately', async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole('radio', { name: '20 km' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ radiusKm: 20 }));

    await userEvent.click(screen.getByRole('checkbox', { name: 'Community access' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        serviceIds: ['personal-care', 'meal-preparation', 'community-access'],
      }),
    );
  });

  it('explains an invalid rate in text and does not apply it', async () => {
    const { onChange } = setup();
    const rate = screen.getByRole('textbox', { name: /Maximum hourly rate/ });
    await userEvent.type(rate, '12.5');
    expect(rate).toHaveAttribute('aria-invalid', 'true');
    expect(rate).toHaveAccessibleDescription(
      /^Error: Enter a whole dollar amount from \$30 to \$150/,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies a valid rate once typing settles', async () => {
    const { onChange } = setup();
    await userEvent.type(screen.getByRole('textbox', { name: /Maximum hourly rate/ }), '65');
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxHourlyRateDollars: 65 })),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('uses a disclosure on narrow screens', async () => {
    mockNarrowScreen();
    setup();
    const toggle = screen.getByRole('button', { name: 'Show filters' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Search radius' })).toBeNull();

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Search radius' })).toBeInTheDocument();
  });
});
