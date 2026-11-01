/**
 * Deterministic, fictional demo dataset. Pure functions only — no database access — so the
 * same input always yields the same records, and the integrity rules can be unit-tested.
 *
 * Everyone here is invented. Locations are suburb + postcode + approximate centroid only:
 * no street addresses, phone numbers, emails or identity documents.
 */
import { haversineKm } from '../../shared/geo';
import {
  addDays,
  dayOfWeek,
  localDateOf,
  parseLocalDate,
  zonedDateTimeToUtc,
  type LocalDate,
} from '../../shared/zoned-time';

export const DEMO_TIMEZONE = 'Australia/Sydney';
export const DEMO_SUPPORT_REQUEST_ID = 'support_demo_001';
const SESSION_START = [10, 0] as const;
const SESSION_END = [13, 0] as const;

export const SERVICES = [
  { slug: 'personal-care', name: 'Personal care' },
  { slug: 'meal-preparation', name: 'Meal preparation' },
  { slug: 'transport', name: 'Transport' },
  { slug: 'social-support', name: 'Social support' },
  { slug: 'domestic-assistance', name: 'Domestic assistance' },
  { slug: 'community-access', name: 'Community access' },
  { slug: 'mobility-support', name: 'Mobility support' },
  { slug: 'companionship', name: 'Companionship' },
] as const;
export type ServiceSlug = (typeof SERVICES)[number]['slug'];

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'el', name: 'Greek' },
  { code: 'it', name: 'Italian' },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface Suburb {
  name: string;
  postcode: string;
  latitude: number;
  longitude: number;
}

/** Approximate public suburb centroids around Parramatta, NSW. */
const SUBURBS: readonly Suburb[] = [
  { name: 'Parramatta', postcode: '2150', latitude: -33.815, longitude: 151.0011 },
  { name: 'Harris Park', postcode: '2150', latitude: -33.8231, longitude: 151.0083 },
  { name: 'Westmead', postcode: '2145', latitude: -33.807, longitude: 150.9876 },
  { name: 'Granville', postcode: '2142', latitude: -33.8327, longitude: 151.0108 },
  { name: 'Rydalmere', postcode: '2116', latitude: -33.8117, longitude: 151.0355 },
  { name: 'Merrylands', postcode: '2160', latitude: -33.8366, longitude: 150.9893 },
  { name: 'Wentworthville', postcode: '2145', latitude: -33.807, longitude: 150.972 },
  { name: 'Ermington', postcode: '2115', latitude: -33.813, longitude: 151.054 },
  { name: 'Auburn', postcode: '2144', latitude: -33.8494, longitude: 151.0329 },
  { name: 'Toongabbie', postcode: '2146', latitude: -33.788, longitude: 150.952 },
  { name: 'Carlingford', postcode: '2118', latitude: -33.782, longitude: 151.049 },
  { name: 'Lidcombe', postcode: '2141', latitude: -33.864, longitude: 151.044 },
  { name: 'Seven Hills', postcode: '2147', latitude: -33.774, longitude: 150.937 },
  { name: 'Baulkham Hills', postcode: '2153', latitude: -33.76, longitude: 150.992 },
  { name: 'Epping', postcode: '2121', latitude: -33.773, longitude: 151.082 },
  { name: 'Strathfield', postcode: '2135', latitude: -33.873, longitude: 151.094 },
  { name: 'Blacktown', postcode: '2148', latitude: -33.771, longitude: 150.906 },
  { name: 'Castle Hill', postcode: '2154', latitude: -33.731, longitude: 151.004 },
  { name: 'Bankstown', postcode: '2200', latitude: -33.917, longitude: 151.035 },
  { name: 'Ryde', postcode: '2112', latitude: -33.815, longitude: 151.105 },
  { name: 'Liverpool', postcode: '2170', latitude: -33.92, longitude: 150.923 },
];

const CUSTOMER_LOCATION = SUBURBS[0] as Suburb;

const GENERATED_FIRST_NAMES = [
  'Oliver',
  'Grace',
  'Mei',
  'Lucas',
  'Hannah',
  'Tom',
  'Zara',
  'Omar',
  'Leila',
  'Ethan',
  'Isla',
  'Mateo',
  'Nina',
  'Ravi',
  'Ana',
  'Ben',
  'Hugo',
  'Ivy',
  'Jack',
  'Kai',
  'Lily',
  'Mia',
  'Nadia',
  'Owen',
  'Ruby',
  'Sam',
  'Tara',
  'Uma',
  'Vince',
  'Wen',
  'Yusuf',
  'Zoe',
  'Elena',
  'Farah',
  'George',
  'Hiro',
  'Ines',
  'Jun',
  'Kofi',
  'Layla',
  'Marco',
  'Nikos',
  'Olivia',
  'Pedro',
  'Quinn',
  'Rosa',
  'Sienna',
  'Thanh',
  'Vera',
  'Will',
  'Yara',
  'Linh',
  'Callum',
  'Esther',
] as const;
const LAST_INITIALS = 'ABCDEFGHJKLMNPRSTVWY';

export type SeedAvailabilityStatus = 'AVAILABLE' | 'TENTATIVE' | 'BOOKED' | 'UNAVAILABLE';

export interface SeedWorker {
  id: string;
  firstName: string;
  lastInitial: string;
  bio: string;
  hourlyRateCents: number;
  rating: string; // numeric(2,1) as an exact decimal string
  reviewCount: number;
  suburb: string;
  postcode: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  hasTransport: boolean;
  yearsExperience: number;
  services: ServiceSlug[];
  languages: LanguageCode[];
}

export interface SeedSlot {
  id: string;
  workerId: string;
  startsAt: Date;
  endsAt: Date;
  status: SeedAvailabilityStatus;
  version: number;
}

export interface SeedSupportRequest {
  id: string;
  status: 'CANCELLED_NEEDS_REPLACEMENT';
  timezone: string;
  startsAt: Date;
  endsAt: Date;
  suburb: string;
  postcode: string;
  latitude: number;
  longitude: number;
  services: ServiceSlug[];
}

export interface SeedDataset {
  sessionDate: LocalDate;
  supportRequest: SeedSupportRequest;
  workers: SeedWorker[];
  slots: SeedSlot[];
}

/** mulberry32 — tiny, fast, deterministic PRNG. Not for security. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const chance = (p: number) => next() < p;
  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new Error('pick() from empty list');
    return item;
  }
  return { next, int, chance, pick };
}

/**
 * The demo session is the next Saturday (Sydney time) at least two days away, so the scenario
 * always reads as "upcoming". DEMO_SESSION_DATE=YYYY-MM-DD pins it for screenshots and tests.
 */
export function resolveDemoSessionDate(now: Date, override?: string): LocalDate {
  if (override) return parseLocalDate(override);
  const earliest = addDays(localDateOf(now, DEMO_TIMEZONE), 2);
  const daysUntilSaturday = (6 - dayOfWeek(earliest) + 7) % 7;
  return addDays(earliest, daysUntilSaturday);
}

/** Wall-clock time [hours, minutes]. */
type Clock = readonly [number, number];
type SlotWindow = readonly [Clock, Clock];

const at = (date: LocalDate, [hours, minutes]: Clock) =>
  zonedDateTimeToUtc(date, hours, minutes, DEMO_TIMEZONE);

const COVERING_WINDOWS: readonly SlotWindow[] = [
  [
    [8, 0],
    [14, 0],
  ],
  [
    [9, 0],
    [15, 0],
  ],
  [
    [7, 30],
    [13, 30],
  ],
  [
    [10, 0],
    [16, 0],
  ],
];
const PARTIAL_WINDOWS: readonly SlotWindow[] = [
  [
    [11, 0],
    [17, 0],
  ],
  [
    [6, 0],
    [11, 0],
  ],
  [
    [13, 0],
    [18, 0],
  ],
];

/**
 * Six recognisable workers used throughout the README, demo controls and E2E tests.
 * Their IDs and session-day slots are fixed so tests never depend on generated ordering.
 */
interface FeaturedWorker extends Omit<SeedWorker, 'bio'> {
  sessionSlot: { start: Clock; end: Clock; status: SeedAvailabilityStatus; version: number };
}

const FEATURED_WORKERS: readonly FeaturedWorker[] = [
  {
    id: 'worker_017',
    firstName: 'Amelia',
    lastInitial: 'R',
    hourlyRateCents: 5800,
    rating: '4.9',
    reviewCount: 42,
    suburb: 'North Parramatta',
    postcode: '2151',
    latitude: -33.7934,
    longitude: 151.0011,
    verified: true,
    hasTransport: true,
    yearsExperience: 8,
    services: ['personal-care', 'meal-preparation', 'transport', 'companionship'],
    languages: ['en', 'ar'],
    sessionSlot: { start: [8, 0], end: [14, 0], status: 'AVAILABLE', version: 41 },
  },
  {
    id: 'worker_004',
    firstName: 'Sofia',
    lastInitial: 'K',
    hourlyRateCents: 6100,
    rating: '4.8',
    reviewCount: 31,
    suburb: 'Harris Park',
    postcode: '2150',
    latitude: -33.8231,
    longitude: 151.0083,
    verified: true,
    hasTransport: false,
    yearsExperience: 11,
    services: ['personal-care', 'meal-preparation', 'social-support'],
    languages: ['en', 'el'],
    sessionSlot: { start: [9, 0], end: [15, 0], status: 'UNAVAILABLE', version: 3 },
  },
  {
    id: 'worker_009',
    firstName: 'James',
    lastInitial: 'T',
    hourlyRateCents: 5500,
    rating: '4.7',
    reviewCount: 19,
    suburb: 'Granville',
    postcode: '2142',
    latitude: -33.8327,
    longitude: 151.0108,
    verified: true,
    hasTransport: true,
    yearsExperience: 5,
    services: ['personal-care', 'meal-preparation', 'domestic-assistance', 'transport'],
    languages: ['en'],
    sessionSlot: { start: [8, 0], end: [14, 0], status: 'AVAILABLE', version: 7 },
  },
  {
    id: 'worker_023',
    firstName: 'Priya',
    lastInitial: 'M',
    hourlyRateCents: 6400,
    rating: '4.9',
    reviewCount: 57,
    suburb: 'Westmead',
    postcode: '2145',
    latitude: -33.807,
    longitude: 150.9876,
    verified: true,
    hasTransport: false,
    yearsExperience: 13,
    services: ['personal-care', 'meal-preparation', 'mobility-support'],
    languages: ['en', 'hi', 'ur'],
    sessionSlot: { start: [9, 0], end: [15, 0], status: 'AVAILABLE', version: 12 },
  },
  {
    id: 'worker_031',
    firstName: 'Daniel',
    lastInitial: 'L',
    hourlyRateCents: 5200,
    rating: '4.6',
    reviewCount: 12,
    suburb: 'Carlingford',
    postcode: '2118',
    latitude: -33.782,
    longitude: 151.049,
    verified: true,
    hasTransport: true,
    yearsExperience: 3,
    services: ['personal-care', 'meal-preparation', 'community-access', 'transport'],
    languages: ['en', 'vi'],
    sessionSlot: { start: [8, 0], end: [14, 0], status: 'AVAILABLE', version: 2 },
  },
  {
    id: 'worker_042',
    firstName: 'Aisha',
    lastInitial: 'N',
    hourlyRateCents: 6000,
    rating: '4.8',
    reviewCount: 26,
    suburb: 'Merrylands',
    postcode: '2160',
    latitude: -33.8366,
    longitude: 150.9893,
    verified: true,
    hasTransport: false,
    yearsExperience: 9,
    services: ['personal-care', 'meal-preparation'],
    languages: ['en', 'ar', 'ur'],
    // Available, but only from 11:00 — so she does NOT cover the 10:00–13:00 session.
    sessionSlot: { start: [11, 0], end: [15, 0], status: 'AVAILABLE', version: 4 },
  },
];

export const FEATURED_WORKER_IDS = {
  amelia: 'worker_017',
  sofia: 'worker_004',
  james: 'worker_009',
  priya: 'worker_023',
  daniel: 'worker_031',
  aisha: 'worker_042',
} as const;

export const sessionSlotId = (workerId: string) => workerId.replace('worker_', 'availability_');

const serviceName = (slug: ServiceSlug) =>
  (SERVICES.find((service) => service.slug === slug)?.name ?? slug).toLowerCase();

function writeBio(services: readonly ServiceSlug[], years: number): string {
  const [first, second] = services;
  const focus =
    first && second
      ? `${serviceName(first)} and ${serviceName(second)}`
      : first
        ? serviceName(first)
        : 'everyday support';
  return `${years} ${years === 1 ? 'year' : 'years'} of experience, mostly in ${focus}. I like to learn your routine first and work at the pace that suits you.`;
}

export function buildSeedDataset(sessionDate: LocalDate): SeedDataset {
  const random = createRandom(20261107);
  const workers: SeedWorker[] = [];
  const slots: SeedSlot[] = [];
  const featuredById = new Map(FEATURED_WORKERS.map((worker) => [worker.id, worker]));
  const nextDay = addDays(sessionDate, 1);
  const dayAfter = addDays(sessionDate, 2);
  let generatedIndex = 0;

  for (let n = 1; n <= 60; n += 1) {
    const id = `worker_${String(n).padStart(3, '0')}`;
    const featured = featuredById.get(id);

    if (featured) {
      const { sessionSlot, ...worker } = featured;
      workers.push({ ...worker, bio: writeBio(worker.services, worker.yearsExperience) });
      slots.push({
        id: sessionSlotId(id),
        workerId: id,
        startsAt: at(sessionDate, sessionSlot.start),
        endsAt: at(sessionDate, sessionSlot.end),
        status: sessionSlot.status,
        version: sessionSlot.version,
      });
    } else {
      const suburb = random.pick(SUBURBS);
      const services = SERVICES.map((s) => s.slug).filter((slug) => {
        if (slug === 'personal-care') return random.chance(0.78);
        if (slug === 'meal-preparation') return random.chance(0.75);
        return random.chance(0.3);
      });
      if (services.length === 0) services.push('companionship');
      const languages: LanguageCode[] = ['en'];
      for (const language of LANGUAGES.slice(1)) {
        if (random.chance(0.14)) languages.push(language.code);
      }
      const yearsExperience = random.int(1, 20);
      const firstName =
        GENERATED_FIRST_NAMES[generatedIndex % GENERATED_FIRST_NAMES.length] ?? 'Alex';
      generatedIndex += 1;

      workers.push({
        id,
        firstName,
        lastInitial: LAST_INITIALS.charAt(random.int(0, LAST_INITIALS.length - 1)),
        bio: writeBio(services, yearsExperience),
        hourlyRateCents: random.int(48, 72) * 100,
        rating: (random.int(38, 50) / 10).toFixed(1),
        reviewCount: random.int(0, 120),
        suburb: suburb.name,
        postcode: suburb.postcode,
        // Small jitter so workers in one suburb are not at identical coordinates.
        latitude: Number((suburb.latitude + (random.next() - 0.5) * 0.01).toFixed(4)),
        longitude: Number((suburb.longitude + (random.next() - 0.5) * 0.01).toFixed(4)),
        verified: random.chance(0.85),
        // Anyone offering the transport service necessarily has transport.
        hasTransport: services.includes('transport') || random.chance(0.35),
        yearsExperience,
        services,
        languages,
      });

      const roll = random.next();
      if (roll < 0.72) {
        // Covers the whole 10:00–13:00 session.
        const [start, end] = random.pick(COVERING_WINDOWS);
        const statusRoll = random.next();
        slots.push({
          id: sessionSlotId(id),
          workerId: id,
          startsAt: at(sessionDate, start),
          endsAt: at(sessionDate, end),
          status: statusRoll < 0.84 ? 'AVAILABLE' : statusRoll < 0.94 ? 'BOOKED' : 'TENTATIVE',
          version: random.int(1, 9),
        });
      } else if (roll < 0.87) {
        // Available that day, but not for the full session.
        const [start, end] = random.pick(PARTIAL_WINDOWS);
        slots.push({
          id: sessionSlotId(id),
          workerId: id,
          startsAt: at(sessionDate, start),
          endsAt: at(sessionDate, end),
          status: 'AVAILABLE',
          version: random.int(1, 9),
        });
      }
    }

    // Following days give each worker a realistic calendar beyond the demo session.
    if (random.chance(0.6)) {
      slots.push({
        id: `${sessionSlotId(id)}_d1`,
        workerId: id,
        startsAt: at(nextDay, [9, 0]),
        endsAt: at(nextDay, [17, 0]),
        status: 'AVAILABLE',
        version: 1,
      });
    }
    if (random.chance(0.5)) {
      slots.push({
        id: `${sessionSlotId(id)}_d2`,
        workerId: id,
        startsAt: at(dayAfter, [8, 0]),
        endsAt: at(dayAfter, [12, 0]),
        status: 'AVAILABLE',
        version: 1,
      });
    }
  }

  const supportRequest: SeedSupportRequest = {
    id: DEMO_SUPPORT_REQUEST_ID,
    status: 'CANCELLED_NEEDS_REPLACEMENT',
    timezone: DEMO_TIMEZONE,
    startsAt: at(sessionDate, SESSION_START),
    endsAt: at(sessionDate, SESSION_END),
    suburb: CUSTOMER_LOCATION.name,
    postcode: CUSTOMER_LOCATION.postcode,
    latitude: CUSTOMER_LOCATION.latitude,
    longitude: CUSTOMER_LOCATION.longitude,
    services: ['personal-care', 'meal-preparation'],
  };

  const dataset = { sessionDate, supportRequest, workers, slots };
  assertDatasetIntegrity(dataset);
  return dataset;
}

/** Throws if the generated data contradicts itself. Run on every seed and in unit tests. */
export function assertDatasetIntegrity({ workers, slots, supportRequest }: SeedDataset): void {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const worker of workers) {
    if (ids.has(worker.id)) problems.push(`duplicate worker ${worker.id}`);
    ids.add(worker.id);
    const rating = Number(worker.rating);
    if (!(rating >= 0 && rating <= 5)) problems.push(`${worker.id} rating out of range`);
    if (worker.reviewCount < 0) problems.push(`${worker.id} negative review count`);
    if (
      !Number.isInteger(worker.hourlyRateCents) ||
      worker.hourlyRateCents < 3000 ||
      worker.hourlyRateCents > 15000
    ) {
      problems.push(`${worker.id} unrealistic hourly rate`);
    }
    if (worker.services.includes('transport') && !worker.hasTransport) {
      problems.push(`${worker.id} offers transport without having transport`);
    }
    if (haversineKm(worker, supportRequest) > 40)
      problems.push(`${worker.id} implausibly far away`);
  }

  const slotsByWorker = new Map<string, SeedSlot[]>();
  for (const slot of slots) {
    if (!ids.has(slot.workerId)) problems.push(`${slot.id} references unknown worker`);
    if (slot.endsAt <= slot.startsAt) problems.push(`${slot.id} ends before it starts`);
    const list = slotsByWorker.get(slot.workerId) ?? [];
    for (const other of list) {
      if (slot.startsAt < other.endsAt && other.startsAt < slot.endsAt) {
        problems.push(`${slot.id} overlaps ${other.id}`);
      }
    }
    list.push(slot);
    slotsByWorker.set(slot.workerId, list);
  }

  if (problems.length > 0) {
    throw new Error(`Seed data integrity check failed:\n- ${problems.join('\n- ')}`);
  }
}
