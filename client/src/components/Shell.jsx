import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiClock, FiHeart, FiHome, FiInfo, FiMenu, FiMoon, FiSearch, FiSettings, FiX } from 'react-icons/fi';
import logo from '../images/brand-logo-light.svg';
import logoDark from '../images/brand-logo-dark.svg';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import SearchBox from './SearchBox.jsx';

export function Avatar({ user, size = 'h-9 w-9 text-xs' }) {
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';
  return (
    <span className={`grid ${size} place-items-center rounded-full border border-line/[0.14] bg-surface font-medium text-ink`} aria-hidden="true">
      {initials}
    </span>
  );
}

function Logo({ className = 'h-7 w-auto' }) {
  const { theme } = useTheme();
  return <img src={theme === 'light' ? logoDark : logo} alt="Clinema" className={className} width="122" height="28" />;
}

/** The one definition of primary navigation (sidebar + mobile menu). */
function useNavItems() {
  const { isAuthenticated } = useAuth();
  return [
    { to: '/', label: 'Home', icon: FiHome, end: true },
    ...(isAuthenticated
      ? [
          { to: '/history', label: 'History', icon: FiClock },
          { to: '/library', label: 'Library', icon: FiHeart },
        ]
      : []),
    { to: '/about', label: 'About', icon: FiInfo },
    ...(isAuthenticated ? [{ to: '/profile', label: 'Settings', icon: FiSettings }] : []),
  ];
}

function NavItems({ onNavigate }) {
  const items = useNavItems();
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-accent/[0.14] font-medium text-accent before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r before:bg-accent'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={toggle}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-line/[0.08] px-3 py-2.5 text-sm text-muted transition-colors hover:text-ink"
    >
      <span className="flex items-center gap-3">
        <FiMoon className="h-4 w-4" aria-hidden="true" /> Dark mode
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${dark ? 'bg-accent' : 'bg-line/20'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-canvas shadow transition-transform duration-200 ${dark ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

/** Desktop sidebar. */
export function Sidebar() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  return (
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-line/[0.08] bg-canvas px-4 pb-4 pt-6 lg:flex">
      <Link to="/" className="mb-10 px-3" aria-label="Clinema home">
        <Logo />
      </Link>
      <nav aria-label="Main">
        <NavItems />
      </nav>
      <div className="mt-auto space-y-3">
        {!isAuthenticated && pathname !== '/auth' && (
          <Link
            to="/auth"
            className="flex h-10 items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong"
          >
            Sign in
          </Link>
        )}
        <ThemeSwitch />
      </div>
    </aside>
  );
}

function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  if (!isAuthenticated) {
    return pathname === '/auth' ? null : (
      <Link to="/auth" className="hidden text-sm font-medium text-ink hover:text-accent sm:block lg:hidden">
        Sign in
      </Link>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user?.first_name || 'you'}`}
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-56 animate-fade-in rounded-md border border-line/[0.08] bg-surface py-1 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.5)]">
          <p className="truncate px-3 py-2 text-xs text-subtle">{user?.email}</p>
          <Link role="menuitem" to="/profile" className="block px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-ink">
            Settings
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="block w-full px-3 py-2 text-left text-sm text-muted hover:bg-surface-hover hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Top bar: film search + account (desktop); logo, search, menu (mobile). */
export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pathname, search } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, search]);

  // Transparent over the home hero on desktop; solid once scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        scrolled ? 'border-line/[0.08] bg-canvas/95' : 'border-line/[0.08] bg-canvas lg:border-transparent lg:bg-transparent'
      }`}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-ink">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link to="/" className="shrink-0 lg:hidden" aria-label="Clinema home">
          <Logo className="h-6 w-auto" />
        </Link>
        <div className="ml-auto hidden w-full max-w-sm lg:block">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-muted hover:text-ink lg:hidden"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label={searchOpen ? 'Close search' : 'Search for a film'}
            aria-expanded={searchOpen}
          >
            {searchOpen ? <FiX className="h-5 w-5" /> : <FiSearch className="h-5 w-5" />}
          </button>
          <AccountMenu />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-muted hover:text-ink lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {searchOpen && (
        <div className="animate-fade-in px-4 pb-3 lg:hidden">
          <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div id="mobile-menu" className="absolute inset-y-0 left-0 flex w-72 animate-slide-in flex-col border-r border-line/[0.08] bg-canvas px-4 pb-4 pt-5">
            <div className="mb-8 flex items-center justify-between px-3">
              <Logo className="h-6 w-auto" />
              <button type="button" onClick={() => setMenuOpen(false)} className="grid h-9 w-9 place-items-center rounded-md text-muted hover:text-ink" aria-label="Close menu">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Main">
              <NavItems onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="mt-auto space-y-3">
              {!isAuthenticated && pathname !== '/auth' && (
                <Link to="/auth" className="flex h-10 items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-ink">
                  Sign in
                </Link>
              )}
              <ThemeSwitch />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
