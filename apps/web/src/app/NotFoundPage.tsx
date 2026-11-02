import { Link } from 'react-router';
import { PageHeading } from '../shared/accessibility/page-heading';

export default function NotFoundPage() {
  return (
    <>
      <PageHeading>Page not found</PageHeading>
      <p>We couldn't find that page. The link may be old or mistyped.</p>
      <p>
        <Link to="/">Go to your upcoming support</Link>
      </p>
    </>
  );
}
