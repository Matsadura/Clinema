import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import HomePage from './pages/HomePage.jsx';

// Secondary pages are code-split so the landing page loads fast.
const DiscoverPage = lazy(() => import('./pages/DiscoverPage.jsx'));
const LibraryPage = lazy(() => import('./pages/LibraryPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="library" element={<RequireAuth><LibraryPage /></RequireAuth>} />
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Legacy URLs from the first version of the app */}
        <Route path="AllMovies" element={<Navigate to="/discover" replace />} />
        <Route path="liked-movies" element={<Navigate to="/library?tab=liked" replace />} />
        <Route path="saved-movies" element={<Navigate to="/library?tab=saved" replace />} />
        <Route path="users/profile" element={<Navigate to="/profile" replace />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
