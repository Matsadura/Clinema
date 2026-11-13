import { lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LibraryProvider } from './hooks/useLibrary.js';
import { MovieDrawerProvider } from './context/MovieDrawerContext.jsx';
import DiscoverPage from './pages/DiscoverPage.jsx';

// Secondary pages are code-split so the discovery screen loads fast.
const LibraryPage = lazy(() => import('./pages/LibraryPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

/** /discover used to be a separate results page; it now lives on "/". */
function ToHome() {
  const { search } = useLocation();
  return <Navigate to={`/${search}`} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LibraryProvider>
        <MovieDrawerProvider>
          <AppRoutes />
        </MovieDrawerProvider>
      </LibraryProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DiscoverPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Legacy URLs */}
        <Route path="discover" element={<ToHome />} />
        <Route path="AllMovies" element={<Navigate to="/" replace />} />
        <Route path="liked-movies" element={<Navigate to="/library?tab=liked" replace />} />
        <Route path="saved-movies" element={<Navigate to="/library?tab=saved" replace />} />
        <Route path="users/profile" element={<Navigate to="/profile" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
