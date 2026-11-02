import type { ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Field,
  Fieldset,
  Input,
  LoadingIndicator,
  Radio,
  Select,
  Skeleton,
} from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import styles from './ComponentsPage.module.css';
import type { AvailabilityStatus, WorkerSummary } from '@acf/contracts';
import { AvailabilityBadge } from '../../replacement-search/components/AvailabilityBadge';
import { WorkerCard } from '../../replacement-search/components/WorkerCard';

const COLOR_TOKENS: { token: string; use: string; contrast?: string }[] = [
  { token: '--color-text-primary', use: 'Body text', contrast: '15.1 : 1 on background' },
  { token: '--color-text-secondary', use: 'Supporting text', contrast: '6.8 : 1 on background' },
  { token: '--color-action', use: 'Primary actions, links', contrast: '7.2 : 1 with white text' },
  { token: '--color-focus', use: 'Focus ring', contrast: '7.2 : 1 on background' },
  { token: '--color-border-strong', use: 'Form control borders', contrast: '4.9 : 1 on surface' },
  { token: '--color-success', use: 'Success text', contrast: '6.4 : 1 on its tint' },
  { token: '--color-warning', use: 'Warning text', contrast: '7.3 : 1 on its tint' },
  { token: '--color-danger', use: 'Error text', contrast: '6.3 : 1 on its tint' },
  { token: '--color-background', use: 'Page background' },
  { token: '--color-surface', use: 'Cards and panels' },
];

const SPACING = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8'];
const sampleWorker = (status: AvailabilityStatus): WorkerSummary => ({
  id: `sample_${status.toLowerCase()}`,
  firstName: status === 'AVAILABLE' ? 'Jordan' : 'Casey',
  lastInitial: status === 'AVAILABLE' ? 'P' : 'W',
  verified: true,
  rating: 4.8,
  reviewCount: 23,
  hourlyRateCents: 6000,
  distanceKm: 3.1,
  services: [
    { id: 'personal-care', name: 'Personal care' },
    { id: 'meal-preparation', name: 'Meal preparation' },
  ],
  languages: [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Vietnamese' },
  ],
  hasTransport: true,
  availability: { slotId: 'sample', status, version: 1 },
});

const SECTIONS = [
  ['tokens', 'Tokens'],
  ['buttons', 'Buttons'],
  ['forms', 'Form fields'],
  ['status', 'Status'],
  ['loading', 'Loading and empty'],
  ['cards', 'Worker cards'],
] as const;

function Example({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className={styles.example}>
      <h3>{title}</h3>
      {note ? <p className={styles.note}>{note}</p> : null}
      <div className={styles.demo}>{children}</div>
    </div>
  );
}

function CatalogueSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={styles.section}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/**
 * Living catalogue of the design system, showing the states that matter for accessibility
 * (focus, disabled, error, loading). Everything here is a real, interactive component.
 */
export default function ComponentsPage() {
  return (
    <div className={styles.page}>
      <PageHeading>Component catalogue</PageHeading>
      <p className={styles.lead}>
        Primitives from <code>@acf/ui</code>. Every control here is real: use Tab to see focus
        styles.
      </p>

      <nav aria-label="Catalogue sections" className={styles.toc}>
        <ul>
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <CatalogueSection id="tokens" title="Design tokens">
        <Example title="Colour" note="Contrast ratios were measured, not assumed.">
          <ul className={styles.swatches}>
            {COLOR_TOKENS.map(({ token, use, contrast }) => (
              <li key={token}>
                <span
                  aria-hidden="true"
                  className={styles.swatch}
                  style={{ background: `var(${token})` }}
                />
                <span>
                  <code>{token}</code>
                  <br />
                  {use}
                  {contrast ? <span className={styles.note}> — {contrast}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Example>
        <Example title="Typography" note="System font stack; the smallest size is 15px.">
          <p className={styles.typeXl}>Heading 2xl — 32px</p>
          <p className={styles.typeLg}>Heading lg — 20px</p>
          <p>Body — 17px with 1.6 line height</p>
          <p className={styles.note}>Small — 15px, used for hints and captions</p>
        </Example>
        <Example title="Spacing" note="4px base scale.">
          <ul className={styles.spacing}>
            {SPACING.map((token) => (
              <li key={token}>
                <span
                  aria-hidden="true"
                  className={styles.spacer}
                  style={{ width: `var(${token})` }}
                />
                <code>{token}</code>
              </li>
            ))}
          </ul>
        </Example>
      </CatalogueSection>

      <CatalogueSection id="buttons" title="Buttons">
        <Example
          title="Variants"
          note="Minimum target 44 × 44 px. Hover changes colour; focus adds a 3px offset ring."
        >
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger">Destructive</Button>
        </Example>
        <Example title="States">
          <Button disabled>Disabled</Button>
          <Button busy busyLabel="Saving…">
            Save
          </Button>
          <span className={styles.forcedFocus}>
            <Button variant="secondary" tabIndex={-1}>
              Focus ring preview
            </Button>
          </span>
        </Example>
      </CatalogueSection>

      <CatalogueSection id="forms" title="Form fields">
        <div className={styles.grid}>
          <Example title="Text input with hint">
            <Field label="Suburb" hint="For example, Parramatta">
              {(control) => <Input {...control} />}
            </Field>
          </Example>
          <Example title="Required">
            <Field label="Postcode" required>
              {(control) => <Input {...control} inputMode="numeric" />}
            </Field>
          </Example>
          <Example
            title="Error"
            note="Text explains the fix; the border thickens and the message is linked."
          >
            <Field
              label="Maximum hourly rate (AUD)"
              error="Enter a whole dollar amount from $30 to $150."
            >
              {(control) => <Input {...control} defaultValue="12.5" />}
            </Field>
          </Example>
          <Example title="Native select">
            <Field label="Sort by">
              {(control) => (
                <Select {...control} defaultValue="recommended">
                  <option value="recommended">Recommended</option>
                  <option value="closest">Closest</option>
                </Select>
              )}
            </Field>
          </Example>
          <Example title="Checkboxes">
            <Fieldset legend="Languages">
              <Checkbox label="Arabic" defaultChecked />
              <Checkbox label="Greek" />
              <Checkbox label="Unavailable option" disabled />
            </Fieldset>
          </Example>
          <Example title="Radios">
            <Fieldset legend="Search radius">
              <Radio name="catalogue-radius" label="5 km" />
              <Radio name="catalogue-radius" label="10 km" defaultChecked />
              <Radio name="catalogue-radius" label="20 km" />
            </Fieldset>
          </Example>
        </div>
      </CatalogueSection>

      <CatalogueSection id="status" title="Status">
        <Example title="Badges" note="Text first; icon shapes differ by tone.">
          <Badge>Neutral</Badge>
          <Badge tone="info" withIcon>
            Verified
          </Badge>
          <Badge tone="success" withIcon>
            Success
          </Badge>
          <Badge tone="warning" withIcon>
            Warning
          </Badge>
          <Badge tone="danger" withIcon>
            Problem
          </Badge>
        </Example>
        <Example
          title="Availability"
          note="Booked and unavailable both read “No longer available” to customers."
        >
          {(['AVAILABLE', 'TENTATIVE', 'BOOKED', 'UNAVAILABLE'] as const).map((status) => (
            <AvailabilityBadge key={status} status={status} />
          ))}
        </Example>
        <div className={styles.stack}>
          <Alert tone="info" title="Information" headingLevel={3}>
            <p>Neutral guidance.</p>
          </Alert>
          <Alert tone="success" title="Replacement support confirmed" headingLevel={3} />
          <Alert
            tone="warning"
            title="Your regular support worker is no longer available"
            headingLevel={3}
          />
          <Alert tone="danger" title="We couldn't update your matches" headingLevel={3}>
            <p>Your current results are still shown.</p>
          </Alert>
        </div>
      </CatalogueSection>

      <CatalogueSection id="loading" title="Loading and empty states">
        <Example
          title="Loading indicator"
          note="The spinner stops under reduced motion; the text carries the meaning."
        >
          <LoadingIndicator label="Loading matching support workers…" />
        </Example>
        <Example title="Skeleton" note="Hidden from assistive technology.">
          <div className={styles.skeleton}>
            <Skeleton height="1.5rem" width="40%" />
            <Skeleton />
            <Skeleton width="70%" />
          </div>
        </Example>
        <EmptyState
          headingLevel={3}
          title="No workers currently match all of these preferences"
          actions={
            <>
              <Button>Increase search radius to 20 km</Button>
              <Button variant="secondary">Clear optional filters</Button>
            </>
          }
        >
          <p>Try increasing the search radius or removing an optional filter.</p>
        </EmptyState>
      </CatalogueSection>
      <CatalogueSection id="cards" title="Worker cards">
        <ul className={styles.cards}>
          <li>
            <WorkerCard
              worker={sampleWorker('AVAILABLE')}
              profileHref="/components"
              selectHref="/components"
            />
          </li>
          <li>
            <WorkerCard
              worker={sampleWorker('UNAVAILABLE')}
              profileHref="/components"
              selectHref="/components"
            />
          </li>
        </ul>
      </CatalogueSection>
    </div>
  );
}
