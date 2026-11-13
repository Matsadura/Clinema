import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { PageSpinner } from './ui.jsx';

export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
