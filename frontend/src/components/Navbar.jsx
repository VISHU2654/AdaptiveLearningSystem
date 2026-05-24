import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-surface-light/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-all duration-200">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-lg font-bold gradient-text">AdaptLearn</span>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Tour Button */}
              <button
                onClick={() => {
                  if (window.startProductTour) {
                    window.startProductTour();
                  } else {
                    navigate('/dashboard');
                    setTimeout(() => window.startProductTour?.(), 500);
                  }
                }}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface/60 hover:bg-surface border border-transparent hover:border-surface-light text-slate-300 transition-all duration-200"
                title="Take a Tour"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* User Menu Button */}
              <button
                id="user-menu-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-3 bg-surface/60 hover:bg-surface rounded-lg px-3 py-2 transition-all duration-200 border border-transparent hover:border-surface-light"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-300 hidden sm:block">
                  {user?.full_name || 'User'}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dropdown — rendered OUTSIDE the nav as a fixed overlay */}
      {dropdownOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: '72px',
            right: '16px',
            width: '192px',
            zIndex: 99999,
            background: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            borderRadius: '12px',
            boxShadow: '0 24px 80px rgba(2, 6, 23, 0.4)',
            padding: '4px 0',
          }}
        >
          <Link
            to="/profile"
            onClick={() => setDropdownOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', color: '#cbd5e1', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </Link>
          <Link
            to="/certificates"
            onClick={() => setDropdownOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', color: '#cbd5e1', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>Certificates</span>
          </Link>
          {user?.is_admin && (
            <Link
              to="/settings"
              onClick={() => setDropdownOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', color: '#cbd5e1', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.591 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.592c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.591c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.591 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.592-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.591c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.592c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.592-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </Link>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid rgba(148, 163, 184, 0.14)', margin: '4px 0' }} />
          <button
            id="logout-button"
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '14px', color: '#fb7185', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)'; e.currentTarget.style.color = '#fda4af'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fb7185'; }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}
    </>
  );
}

export default Navbar;
