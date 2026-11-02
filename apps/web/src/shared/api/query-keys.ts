/**
 * Every server-state cache entry is addressed through these factories, so invalidation and
 * SSE patching can target families (`queryKeys.workerSearches()`) without string guessing.
 */
export const queryKeys = {
  supportRequests: () => ['support-requests'] as const,
  supportRequest: (id: string) => ['support-requests', id] as const,
};
