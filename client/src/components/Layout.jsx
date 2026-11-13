import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, Topbar } from './Shell.jsx';
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
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col">
        <Topbar />
        <main id="main" className="flex-1">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </div>
  );
}
