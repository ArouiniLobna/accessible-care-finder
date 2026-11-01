import type { SupportRequest } from '@acf/contracts';
import { notFound } from '../../shared/errors';
import type { SupportRequestRecord, SupportRequestRepository } from './support-request.repository';

/** Strip internal fields (coordinates) before anything leaves the API. */
export function toSupportRequestDto(record: SupportRequestRecord): SupportRequest {
  const { latitude: _latitude, longitude: _longitude, ...dto } = record;
  return dto;
}

export function createSupportRequestService(repository: SupportRequestRepository) {
  return {
    async get(id: string): Promise<SupportRequest> {
      const record = await repository.findById(id);
      if (!record) throw notFound('support session');
      return toSupportRequestDto(record);
    },
  };
}

export type SupportRequestService = ReturnType<typeof createSupportRequestService>;
