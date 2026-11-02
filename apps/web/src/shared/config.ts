/** The only place the web app reads build-time configuration. */
export const config = {
  /** '' = same origin (Vite dev/preview proxies /api to the API). */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
  appName: 'Accessible Care Finder',
  /** The seeded scenario. A real product would list the signed-in customer's sessions. */
  demoSupportRequestId: 'support_demo_001',
} as const;
