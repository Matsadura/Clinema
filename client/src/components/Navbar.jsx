import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { GiHamburgerMenu } from 'react-icons/gi';
import { IoClose } from 'react-icons/io5';
import { FiLogOut, FiUser, FiHeart } from 'react-icons/fi';
import logo from '../images/brand-logo-light.svg';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition hover:text-primary-light ${isActive ? 'text-primary-light' : 'text-white/80'}`;

export function Avatar({ user, size = 'h-9 w-9' }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  return (
    <span className={`grid ${size} place-items-center rounded-full bg-gradient-to-br from-primary to-secondary-lighter text-sm font-bold`} aria-hidden="true">
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

  // Close menus on navigation
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
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

  const links = (
    <>
      <NavLink to="/" end className={linkClass}>
        Discover
      </NavLink>
      <NavLink to="/about" className={linkClass}>
        How it works
      </NavLink>
      {isAuthenticated && (
        <NavLink to="/library" className={linkClass}>
          My library
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-secondary-dark/80 backdrop-blur-lg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2">
        Skip to content
      </a>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <div className="flex items-center gap-8">
          <Link to="/" className="shrink-0" aria-label="Clinema home">
            <img src={logo} alt="Clinema" className="h-8 w-auto" width="120" height="32" />
          </Link>
          <div className="hidden items-center gap-1 md:flex">{links}</div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-white/5"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar user={user} />
                <span className="text-sm font-medium">{user?.first_name}</span>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-48 animate-fade-in overflow-hidden rounded-xl border border-white/10 bg-secondary py-1 shadow-xl">
                  <Link role="menuitem" to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5">
                    <FiUser aria-hidden="true" /> Profile
                  </Link>
                  <Link role="menuitem" to="/library" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white/5">
                    <FiHeart aria-hidden="true" /> My library
                  </Link>
                  <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-white/5">
                    <FiLogOut aria-hidden="true" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth" className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white">
                Sign in
              </Link>
              <Link to="/auth?mode=signup" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold hover:bg-primary-light">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-xl md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <IoClose /> : <GiHamburgerMenu />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="animate-fade-in border-t border-white/5 px-4 pb-4 md:hidden">
          {isAuthenticated && (
            <div className="flex items-center gap-3 py-4">
              <Avatar user={user} />
              <div>
                <p className="font-semibold">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-white/50">{user?.email}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            {links}
            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className={linkClass}>
                  Profile
                </NavLink>
                <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80">
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/auth" className="rounded-xl border border-white/15 px-4 py-2 text-center text-sm font-semibold">
                  Sign in
                </Link>
                <Link to="/auth?mode=signup" className="rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
