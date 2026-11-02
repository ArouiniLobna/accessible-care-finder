import { Link, useParams } from 'react-router';
import { Alert, buttonClassName, LoadingIndicator } from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { isApiRequestError } from '../../../shared/api/http';
import { useSupportRequest } from '../../support-session/api/useSupportRequest';
import { SupportRequestSummary } from '../../support-session/components/SupportRequestSummary';
import { useWorkerSearch } from '../api/useWorkerSearch';
import { SearchResults } from '../components/SearchResults';
import { useSearchFilters, withQuery } from '../hooks/useSearchFilters';
import {
  clearOptionalFilters,
  hasOptionalFilters,
  toSearchCriteria,
  widerRadius,
} from '../model/search-criteria';
import styles from './ReplacementSearchPage.module.css';

export default function ReplacementSearchPage() {
  const { supportRequestId = '' } = useParams();
  const { filters, setFilters, queryString } = useSearchFilters();
  const supportRequest = useSupportRequest(supportRequestId);

  const sessionServiceIds = supportRequest.data?.services.map((service) => service.id) ?? [];
  const needsReplacement = supportRequest.data?.status === 'CANCELLED_NEEDS_REPLACEMENT';
  // Criteria are rebuilt every render, but the query key is compared by value, so an equal
  // search never refetches.
  const criteria =
    supportRequest.data && needsReplacement
      ? toSearchCriteria(supportRequestId, filters, sessionServiceIds)
      : null;
  const search = useWorkerSearch(criteria);
  const nextRadius = widerRadius(filters.radiusKm);

  return (
    <div className={styles.page}>
      <PageHeading>Find a replacement</PageHeading>

      {supportRequest.isPending ? (
        <p>
          <LoadingIndicator label="Loading your support session…" />
        </p>
      ) : supportRequest.isError ? (
        <Alert
          tone="danger"
          title={
            isApiRequestError(supportRequest.error, 'NOT_FOUND')
              ? "We couldn't find that support session"
              : "We couldn't load your support session"
          }
          actions={
            <Link to="/" className={buttonClassName({ variant: 'secondary' })}>
              Back to your support
            </Link>
          }
        />
      ) : !needsReplacement ? (
        <Alert
          tone="success"
          title="A replacement is already booked for this session"
          actions={
            supportRequest.data.replacementBookingId ? (
              <Link
                to={`/bookings/${supportRequest.data.replacementBookingId}/confirmation`}
                className={buttonClassName({ variant: 'secondary' })}
              >
                View the booking
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <SupportRequestSummary request={supportRequest.data} />
          <div className={styles.layout}>
            <SearchResults
              query={search}
              sort={filters.sort}
              onSortChange={(sort) => setFilters({ ...filters, sort })}
              widerRadius={nextRadius}
              onWidenRadius={() =>
                nextRadius !== null && setFilters({ ...filters, radiusKm: nextRadius })
              }
              canClearOptional={hasOptionalFilters(filters)}
              onClearOptional={() => setFilters(clearOptionalFilters(filters))}
              profileHref={(workerId) =>
                withQuery(
                  `/workers/${workerId}`,
                  `supportRequestId=${supportRequestId}${queryString ? `&${queryString}` : ''}`,
                )
              }
              selectHref={(workerId) =>
                withQuery(`/replacement/${supportRequestId}/review/${workerId}`, queryString)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
