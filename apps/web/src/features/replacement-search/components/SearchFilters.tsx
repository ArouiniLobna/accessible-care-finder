import { useEffect, useId, useRef, useState } from 'react';
import type { Language, Service } from '@acf/contracts';
import { SEARCH_RADII_KM } from '@acf/contracts/constants';
import { Button, Checkbox, Field, Fieldset, Input, Radio } from '@acf/ui';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { useMediaQuery } from '../../../shared/hooks/useMediaQuery';
import {
  hasOptionalFilters,
  MAX_RATE_LIMITS,
  type SearchFilters as Filters,
} from '../model/search-criteria';
import styles from './SearchFilters.module.css';

interface SearchFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClearOptional: () => void;
  services: readonly Service[];
  languages: readonly Language[];
  sessionServiceIds: readonly string[];
}

const RATE_ERROR = `Enter a whole dollar amount from $${MAX_RATE_LIMITS.min} to $${MAX_RATE_LIMITS.max}, or leave it empty for no limit.`;

function parseRate(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim().replace(/^\$/, '');
  if (trimmed === '') return { value: null, error: null };
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < MAX_RATE_LIMITS.min || value > MAX_RATE_LIMITS.max) {
    return { value: null, error: RATE_ERROR };
  }
  return { value, error: null };
}

/**
 * Only refinements that matter to someone replacing a cancelled session. Date, time and
 * location are already known. Native radios/checkboxes in fieldsets; changes apply as they
 * are made (no submit) — results update in place and the change is announced, focus stays put.
 *
 * Discrete controls apply immediately. Only the typed rate is debounced (300 ms), and only
 * valid values are applied.
 */
export function SearchFilters({
  filters,
  onChange,
  onClearOptional,
  services,
  languages,
  sessionServiceIds,
}: SearchFiltersProps) {
  const wide = useMediaQuery('(min-width: 60rem)');
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const showPanel = wide || expanded;

  const [rateInput, setRateInput] = useState(filters.maxHourlyRateDollars?.toString() ?? '');
  const parsedRate = parseRate(rateInput);
  const debouncedRate = useDebouncedValue(rateInput, 300);

  // Keep the text box in sync when the filter is changed elsewhere ("Clear optional filters").
  const [syncedRate, setSyncedRate] = useState(filters.maxHourlyRateDollars);
  if (syncedRate !== filters.maxHourlyRateDollars) {
    setSyncedRate(filters.maxHourlyRateDollars);
    if (parseRate(rateInput).value !== filters.maxHourlyRateDollars) {
      setRateInput(filters.maxHourlyRateDollars?.toString() ?? '');
    }
  }

  // Apply a settled, valid rate. Only the debounced text triggers this; the latest filters and
  // callback are read from a ref so other filter changes don't re-run it.
  const latest = useRef({ filters, onChange });
  useEffect(() => {
    latest.current = { filters, onChange };
  });
  useEffect(() => {
    const { value, error } = parseRate(debouncedRate);
    const current = latest.current;
    if (!error && value !== current.filters.maxHourlyRateDollars) {
      current.onChange({ ...current.filters, maxHourlyRateDollars: value });
    }
  }, [debouncedRate]);

  const selectedServices = filters.serviceIds ?? sessionServiceIds;
  const toggleService = (id: string, checked: boolean) => {
    const next = checked ? [...selectedServices, id] : selectedServices.filter((s) => s !== id);
    const isSessionDefault =
      next.length === sessionServiceIds.length && next.every((s) => sessionServiceIds.includes(s));
    onChange({ ...filters, serviceIds: isSessionDefault ? null : next });
  };

  const toggleLanguage = (code: string, checked: boolean) =>
    onChange({
      ...filters,
      languageCodes: checked
        ? [...filters.languageCodes, code]
        : filters.languageCodes.filter((c) => c !== code),
    });

  const activeCount =
    (filters.serviceIds !== null ? 1 : 0) +
    filters.languageCodes.length +
    (filters.requireTransport ? 1 : 0) +
    (filters.maxHourlyRateDollars !== null ? 1 : 0);

  return (
    <section aria-labelledby="filters-heading" className={styles.filters}>
      <h2 id="filters-heading" className={styles.heading}>
        Refine matches
      </h2>

      {!wide ? (
        <Button
          variant="secondary"
          fullWidth
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? 'Hide filters' : 'Show filters'}
          {activeCount > 0 ? ` (${activeCount} applied)` : ''}
        </Button>
      ) : null}

      <form
        id={panelId}
        hidden={!showPanel}
        className={styles.form}
        // Changes apply immediately; Enter in the rate box should not reload the page.
        onSubmit={(event) => event.preventDefault()}
      >
        <p className={styles.note}>Matches update as you change these options.</p>

        <Fieldset legend="Search radius">
          <div className={styles.inline}>
            {SEARCH_RADII_KM.map((radius) => (
              <Radio
                key={radius}
                name="radius"
                value={radius}
                label={`${radius} km`}
                checked={filters.radiusKm === radius}
                onChange={() => onChange({ ...filters, radiusKm: radius })}
              />
            ))}
          </div>
        </Fieldset>

        <Fieldset legend="Services needed" hint="Workers must offer every service you tick.">
          {services.map((service) => (
            <Checkbox
              key={service.id}
              name="services"
              value={service.id}
              label={service.name}
              description={
                sessionServiceIds.includes(service.id) ? 'Part of your session' : undefined
              }
              checked={selectedServices.includes(service.id)}
              onChange={(event) => toggleService(service.id, event.currentTarget.checked)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Languages" hint="Show workers who speak any of these.">
          {languages.map((language) => (
            <Checkbox
              key={language.code}
              name="languages"
              value={language.code}
              label={language.name}
              checked={filters.languageCodes.includes(language.code)}
              onChange={(event) => toggleLanguage(language.code, event.currentTarget.checked)}
            />
          ))}
        </Fieldset>

        <Fieldset legend="Transport">
          <Checkbox
            name="transport"
            label="Has their own transport"
            checked={filters.requireTransport}
            onChange={(event) =>
              onChange({ ...filters, requireTransport: event.currentTarget.checked })
            }
          />
        </Fieldset>

        <Field
          label="Maximum hourly rate (AUD)"
          hint="Whole dollars, for example 65. Leave empty for no limit."
          error={parsedRate.error ?? undefined}
        >
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              autoComplete="off"
              value={rateInput}
              onChange={(event) => setRateInput(event.currentTarget.value)}
              className={styles.rate}
            />
          )}
        </Field>

        {hasOptionalFilters(filters) ? (
          <Button
            variant="tertiary"
            onClick={() => {
              setRateInput('');
              onClearOptional();
            }}
          >
            Clear optional filters
          </Button>
        ) : null}
      </form>
    </section>
  );
}
