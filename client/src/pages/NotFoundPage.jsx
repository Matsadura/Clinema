import { Link } from 'react-router-dom';
import { textLink } from '../components/ui.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <p className="label num">404</p>
      <h1 className="mt-3 font-display text-display text-ink">This scene was cut.</h1>
      <p className="mt-3 max-w-prose text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className={`mt-8 inline-block ${textLink}`}>
        Back to discovering
      </Link>
    </div>
  );
}
