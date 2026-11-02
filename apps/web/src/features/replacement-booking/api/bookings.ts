import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingResponse, CreateBookingRequest } from '@acf/contracts';
import { IDEMPOTENCY_KEY_HEADER } from '@acf/contracts/constants';
import { apiRequest, isApiRequestError } from '../../../shared/api/http';
import { STALE_TIMES } from '../../../shared/api/query-client';
import { queryKeys } from '../../../shared/api/query-keys';

export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: ({ signal }) =>
      apiRequest<BookingResponse>(`/api/bookings/${encodeURIComponent(id)}`, { signal }),
    staleTime: STALE_TIMES.booking,
  });
}

export interface CreateBookingVariables {
  request: CreateBookingRequest;
  idempotencyKey: string;
}

/**
 * Confirm a replacement. The same Idempotency-Key is sent on every retry of one attempt, so a
 * retried request after a dropped response returns the original booking instead of a second
 * one. Only network failures are retried; a 409 is an answer, not a glitch.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ request, idempotencyKey }: CreateBookingVariables) =>
      apiRequest<BookingResponse>('/api/replacement-bookings', {
        method: 'POST',
        body: request,
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      }),
    retry: (failureCount, error) => failureCount < 2 && isApiRequestError(error, 'NETWORK_ERROR'),
    retryDelay: (attempt) => 500 * 2 ** attempt,
    onSuccess: (booking) => {
      queryClient.setQueryData(queryKeys.booking(booking.id), booking);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportRequest(booking.supportRequestId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.workers() });
    },
    onError: (error, { request }) => {
      if (
        isApiRequestError(error, 'WORKER_NO_LONGER_AVAILABLE') ||
        isApiRequestError(error, 'BOOKING_CONFLICT')
      ) {
        // The customer's view was stale: refresh matches, the profile and the session.
        void queryClient.invalidateQueries({ queryKey: queryKeys.workers() });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.supportRequest(request.supportRequestId),
        });
      }
    },
  });
}

/** One key per confirmation attempt (crypto.randomUUID: unguessable, 36 URL-safe chars). */
export const createIdempotencyKey = () => crypto.randomUUID();
