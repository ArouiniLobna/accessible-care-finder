import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailabilityStatus,
  DemoAvailabilityResponse,
  DemoFaultsRequest,
  DemoSlotChange,
} from '@acf/contracts';
import { apiRequest } from '../../../shared/api/http';
import { queryKeys } from '../../../shared/api/query-keys';

/** Demo-only endpoints (ENABLE_DEMO_CONTROLS=true on the API). */
export function useDemoAvailability() {
  return useQuery({
    queryKey: queryKeys.demoAvailability(),
    queryFn: ({ signal }) =>
      apiRequest<DemoAvailabilityResponse>('/api/demo/availability', { signal }),
    staleTime: 0,
  });
}

export function useSetSlotStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slotId,
      status,
      broadcast,
    }: {
      slotId: string;
      status: AvailabilityStatus;
      broadcast: boolean;
    }) =>
      apiRequest<DemoSlotChange>(`/api/demo/availability/${encodeURIComponent(slotId)}`, {
        method: 'POST',
        body: { status, broadcast },
      }),
    onSuccess: (change) => {
      // Broadcast changes also arrive over SSE; patching here covers silent changes too.
      queryClient.setQueryData<DemoAvailabilityResponse>(queryKeys.demoAvailability(), (data) =>
        data
          ? {
              ...data,
              slots: data.slots.map((slot) =>
                slot.slotId === change.slotId && change.version > slot.version
                  ? { ...slot, status: change.status, version: change.version }
                  : slot,
              ),
            }
          : data,
      );
    },
  });
}

export function useSetFaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (faults: DemoFaultsRequest) =>
      apiRequest<DemoFaultsRequest>('/api/demo/faults', { method: 'PUT', body: faults }),
    onSuccess: (faults) => {
      queryClient.setQueryData<DemoAvailabilityResponse>(queryKeys.demoAvailability(), (data) =>
        data ? { ...data, faults } : data,
      );
    },
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<undefined>('/api/demo/reset', { method: 'POST' }),
    // The server also broadcasts a resync; resetting this tab's cache directly is immediate.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
