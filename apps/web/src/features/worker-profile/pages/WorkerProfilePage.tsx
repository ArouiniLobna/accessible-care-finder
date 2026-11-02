import { Link, useParams, useSearchParams } from 'react-router';
import { Alert, Badge, buttonClassName, LoadingIndicator } from '@acf/ui';
import { PageHeading } from '../../../shared/accessibility/page-heading';
import { isApiRequestError } from '../../../shared/api/http';
import { displayName, formatList, formatMoney } from '../../../shared/format/format';
import {
  AvailabilityBadge,
  isSelectable,
} from '../../replacement-search/components/AvailabilityBadge';
import { withQuery } from '../../replacement-search/hooks/useSearchFilters';
import { useWorkerProfile } from '../api/useWorkerProfile';
import styles from './WorkerProfilePage.module.css';

export default function WorkerProfilePage() {
  const { workerId = '' } = useParams();
  const [params] = useSearchParams();
  const supportRequestId = params.get('supportRequestId');
  // Everything except supportRequestId is the customer's search state; carry it onwards.
  const filterParams = new URLSearchParams(params);
  filterParams.delete('supportRequestId');
  const filterQuery = filterParams.toString();

  const profile = useWorkerProfile(workerId, supportRequestId);
  const name = profile.data ? displayName(profile.data) : 'Support worker';
  const availability = profile.data?.match?.availability ?? null;

  return (
    <div className={styles.page}>
      {supportRequestId ? (
        <p>
          <Link to={withQuery(`/replacement/${supportRequestId}`, filterQuery)}>
            Back to your matches
          </Link>
        </p>
      ) : null}

      <PageHeading documentTitle={profile.data ? `${name} — profile` : 'Support worker profile'}>
        {profile.data ? name : 'Support worker profile'}
      </PageHeading>

      {profile.isPending ? (
        <p>
          <LoadingIndicator label="Loading profile…" />
        </p>
      ) : profile.isError ? (
        <Alert
          tone="danger"
          title={
            isApiRequestError(profile.error, 'NOT_FOUND')
              ? "We couldn't find that support worker"
              : "We couldn't load this profile"
          }
        />
      ) : (
        <>
          <div className={styles.badges}>
            {profile.data.verified ? (
              <Badge tone="info" withIcon>
                Verified
              </Badge>
            ) : null}
            {profile.data.match ? (
              <AvailabilityBadge status={availability?.status ?? null} />
            ) : null}
          </div>

          <section aria-labelledby="about-heading" className={styles.section}>
            <h2 id="about-heading">About {profile.data.firstName}</h2>
            <p>{profile.data.bio}</p>
            <dl className={styles.facts}>
              <div>
                <dt>Rating</dt>
                <dd>
                  {profile.data.reviewCount > 0
                    ? `${profile.data.rating.toFixed(1)} out of 5 from ${profile.data.reviewCount} reviews`
                    : 'No reviews yet'}
                </dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>
                  {profile.data.yearsExperience}{' '}
                  {profile.data.yearsExperience === 1 ? 'year' : 'years'}
                </dd>
              </div>
              <div>
                <dt>Indicative rate</dt>
                <dd>{formatMoney(profile.data.hourlyRateCents)} per hour</dd>
              </div>
              <div>
                <dt>Based in</dt>
                <dd>
                  {profile.data.suburb}
                  {profile.data.match
                    ? ` (${profile.data.match.distanceKm.toFixed(1)} km from your session)`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{formatList(profile.data.languages.map((l) => l.name))}</dd>
              </div>
              <div>
                <dt>Transport</dt>
                <dd>{profile.data.hasTransport ? 'Has own transport' : 'No own transport'}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="services-heading" className={styles.section}>
            <h2 id="services-heading">Services</h2>
            <ul>
              {profile.data.services.map((service) => (
                <li key={service.id}>{service.name}</li>
              ))}
            </ul>
          </section>

          {supportRequestId ? (
            <div className={styles.actions}>
              {isSelectable(availability?.status) ? (
                <Link
                  to={withQuery(
                    `/replacement/${supportRequestId}/review/${profile.data.id}`,
                    filterQuery,
                  )}
                  className={buttonClassName({ variant: 'primary' })}
                >
                  Select {name}
                </Link>
              ) : (
                <p>
                  {name} can't be selected for this session. Your other matches are still available.
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
