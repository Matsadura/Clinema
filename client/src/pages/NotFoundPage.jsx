import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-7xl font-extrabold text-primary-light">404</p>
      <h1 className="mt-4 text-2xl font-bold">This scene was cut</h1>
      <p className="mt-2 text-white/60">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className="mt-8 rounded-xl bg-primary px-5 py-2.5 font-semibold hover:bg-primary-light">
        Back to discovering
      </Link>
    </div>
  );
}
