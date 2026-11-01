import type { FastifyBaseLogger } from 'fastify';
import type { BookingResponse, CreateBookingRequest } from '@acf/contracts';
import type { Database } from '../../db/client';
import { isPgError, UNIQUE_VIOLATION } from '../../db/client';
import { AppError, notFound, validationError } from '../../shared/errors';
import {
  createAvailabilityRepository,
  type ChangedSlot,
} from '../availability/availability.repository';
import { createSupportRequestRepository } from '../support-requests/support-request.repository';
import { createBookingRepository, type BookingIdentity } from './booking.repository';

export interface CreateBookingResult {
  booking: BookingResponse;
  /** true when an earlier request with the same Idempotency-Key already created it. */
  replayed: boolean;
}

const workerNoLongerAvailable = () =>
  new AppError(
    409,
    'WORKER_NO_LONGER_AVAILABLE',
    'This worker is no longer available for that support session.',
  );

const sessionAlreadyBooked = () =>
  new AppError(
    409,
    'BOOKING_CONFLICT',
    'A replacement has already been booked for this support session.',
  );

const keyReused = () =>
  new AppError(
    422,
    'IDEMPOTENCY_KEY_REUSED',
    'This confirmation was already used for a different booking. Please review and confirm again.',
  );

function sameRequest(existing: BookingIdentity, request: CreateBookingRequest): boolean {
  return (
    existing.supportRequestId === request.supportRequestId &&
    existing.workerId === request.workerId &&
    existing.availabilitySlotId === request.availabilitySlotId
  );
}

type TransactionOutcome =
  | { kind: 'created'; bookingId: string; change: ChangedSlot }
  | { kind: 'replayed'; bookingId: string };

export function createBookingService(deps: { db: Database; log: FastifyBaseLogger }) {
  const { db, log } = deps;
  const bookings = createBookingRepository(db);

  async function loadResponse(bookingId: string): Promise<BookingResponse> {
    const booking = await bookings.findResponse(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} vanished after commit`);
    return booking;
  }

  async function runTransaction(
    request: CreateBookingRequest,
    idempotencyKey: string,
  ): Promise<TransactionOutcome> {
    return db.transaction(async (tx) => {
      const txBookings = createBookingRepository(tx);
      const txRequests = createSupportRequestRepository(tx);
      const txAvailability = createAvailabilityRepository(tx);

      // 1. Serialise confirmations for this session. A concurrent retry with the same key waits
      //    here, then finds the booking below instead of reporting a conflict.
      const supportRequest = await txRequests.findById(request.supportRequestId, {
        forUpdate: true,
      });
      if (!supportRequest) throw notFound('support session');

      const existing = await txBookings.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (!sameRequest(existing, request)) throw keyReused();
        return { kind: 'replayed', bookingId: existing.id };
      }
      if (supportRequest.status !== 'CANCELLED_NEEDS_REPLACEMENT') throw sessionAlreadyBooked();

      if (!(await txBookings.workerProvidesServices(request.workerId, request.supportRequestId))) {
        throw validationError("This worker doesn't provide every service this session needs.");
      }

      // 2. Optimistic concurrency: the authoritative availability check.
      const change = await txAvailability.claimForBooking({
        slotId: request.availabilitySlotId,
        workerId: request.workerId,
        expectedVersion: request.availabilityVersion,
        supportRequestId: request.supportRequestId,
      });
      if (!change) {
        if (
          !(await txAvailability.slotBelongsToWorker(request.availabilitySlotId, request.workerId))
        ) {
          throw notFound('availability');
        }
        throw workerNoLongerAvailable();
      }

      // 3. Record the booking and close the request.
      const bookingId = await txBookings.insert({
        supportRequestId: request.supportRequestId,
        workerId: request.workerId,
        availabilitySlotId: request.availabilitySlotId,
        idempotencyKey,
      });
      await txRequests.markReplacementBooked(request.supportRequestId);
      return { kind: 'created', bookingId, change };
    });
  }

  return {
    async create(
      request: CreateBookingRequest,
      idempotencyKey: string,
    ): Promise<CreateBookingResult> {
      // Fast path for retries after a successful commit: no locks needed.
      const existing = await bookings.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (!sameRequest(existing, request)) throw keyReused();
        return { booking: await loadResponse(existing.id), replayed: true };
      }

      let outcome: TransactionOutcome;
      try {
        outcome = await runTransaction(request, idempotencyKey);
      } catch (error) {
        // Last line of defence: the unique indexes reject anything the logic above missed.
        if (isPgError(error) && error.code === UNIQUE_VIOLATION) {
          const winner = await bookings.findByIdempotencyKey(idempotencyKey);
          if (winner && sameRequest(winner, request)) {
            return { booking: await loadResponse(winner.id), replayed: true };
          }
          throw sessionAlreadyBooked();
        }
        throw error;
      }

      if (outcome.kind === 'replayed') {
        return { booking: await loadResponse(outcome.bookingId), replayed: true };
      }

      log.info(
        {
          bookingId: outcome.bookingId,
          supportRequestId: request.supportRequestId,
          workerId: request.workerId,
          slotVersion: outcome.change.version,
        },
        'replacement booking confirmed',
      );
      return { booking: await loadResponse(outcome.bookingId), replayed: false };
    },

    async get(id: string): Promise<BookingResponse> {
      const booking = await bookings.findResponse(id);
      if (!booking) throw notFound('booking');
      return booking;
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
