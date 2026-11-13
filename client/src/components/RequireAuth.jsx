import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageSpinner } from './ui.jsx';

/** Route guard: renders children for signed-in users, otherwise redirects
 *  to /auth and comes back afterwards. */
export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageSpinner label="Checking your session" />;
  if (status !== 'authenticated') {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
