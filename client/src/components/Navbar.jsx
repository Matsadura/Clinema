import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import logo from '../images/brand-logo-light.svg';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `relative py-1 text-sm transition-colors duration-150 ${
    isActive ? 'text-ink after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-accent' : 'text-muted hover:text-ink'
  }`;

export function Avatar({ user, size = 'h-8 w-8 text-xs' }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  return (
    <span className={`grid ${size} place-items-center rounded-full border border-line/[0.14] bg-surface font-medium text-ink`} aria-hidden="true">
      {initials}
    </span>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => !menuRef.current?.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // The one place navigation is defined; desktop and mobile both render it.
  const links = [
    { to: '/', label: 'Discover', end: true },
    ...(isAuthenticated ? [{ to: '/library', label: 'Library' }] : []),
    { to: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/[0.08] bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to content
      </a>
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex items-center gap-10">
          <Link to="/" className="shrink-0" aria-label="Clinema home">
            <img src={logo} alt="Clinema" className="h-6 w-auto" width="105" height="24" />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center rounded-full"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account menu for ${user?.first_name || 'you'}`}
              >
                <Avatar user={user} />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-52 animate-fade-in rounded-md border border-line/[0.08] bg-surface py-1">
                  <p className="truncate px-3 py-2 text-xs text-subtle">{user?.email}</p>
                  <Link role="menuitem" to="/profile" className="block px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-ink">
                    Profile &amp; settings
                  </Link>
                  <button role="menuitem" type="button" onClick={handleLogout} className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-surface-hover hover:text-ink">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Not repeated on the sign-in page itself
            location.pathname !== '/auth' && (
              <Link to="/auth" className="text-sm font-medium text-ink transition-colors hover:text-accent">
                Sign in
              </Link>
            )
          )}
        </div>

        <button
          type="button"
          className="-mr-2 grid h-10 w-10 place-items-center rounded-md text-muted hover:text-ink md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line/[0.08] px-4 pb-4 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className={({ isActive }) => `block py-3 text-base ${isActive ? 'text-accent' : 'text-ink'}`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
            {isAuthenticated ? (
              <>
                <li>
                  <NavLink to="/profile" className={({ isActive }) => `block py-3 text-base ${isActive ? 'text-accent' : 'text-ink'}`}>
                    Profile &amp; settings
                  </NavLink>
                </li>
                <li>
                  <button type="button" onClick={handleLogout} className="block w-full py-3 text-left text-base text-muted">
                    Sign out
                  </button>
                </li>
              </>
            ) : (
              location.pathname !== '/auth' && (
                <li>
                  <Link to="/auth" className="block py-3 text-base text-ink">
                    Sign in
                  </Link>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
