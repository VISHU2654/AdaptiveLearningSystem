import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PLAN_LABELS } from '../data/courseResources';

function LearningSidebar({ searchTerm, onSearchChange, plan, onPlanChange, onSurprise }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleExplore = () => {
    navigate('/dashboard');
    window.setTimeout(() => {
      document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  return (
    <>
    <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-72 border-r border-white/10 bg-slate-950/60 px-4 py-5 backdrop-blur-2xl lg:block">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search</p>
          <label className="relative block">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.1-5.15a6.25 6.25 0 11-12.5 0 6.25 6.25 0 0112.5 0z" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field py-2.5 pl-9 text-sm"
              placeholder="Search courses, topics..."
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Navigate</p>
          <div className="space-y-2">
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                location.pathname === '/dashboard'
                  ? 'border-accent-300/30 bg-accent-300/15 text-accent-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-5H4v5z" />
                </svg>
              </span>
              Dashboard
            </Link>

            <button
              type="button"
              onClick={handleExplore}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              </span>
              Explore courses
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/dashboard');
                window.setTimeout(onSurprise, 120);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-left text-sm text-emerald-100 transition-colors hover:bg-emerald-300/15"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/10">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              Surprise me
            </button>

            <Link
              to="/profile"
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                location.pathname === '/profile'
                  ? 'border-accent-300/30 bg-accent-300/15 text-accent-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              Profile analytics
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Plan</p>
          <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-950/50 p-1">
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onPlanChange(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  plan === value ? 'bg-accent-300 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Free users can start open courses. Premium courses stay visible with a lock for demos.
          </p>
        </div>
      </div>
    </aside>

    <div className="fixed left-0 right-0 top-16 z-40 border-b border-white/10 bg-slate-950/75 p-3 backdrop-blur-2xl lg:hidden">
      <div className="mb-2 flex gap-2">
        <input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-field py-2 text-sm"
          placeholder="Search courses..."
        />
        <button
          type="button"
          onClick={() => {
            navigate('/dashboard');
            window.setTimeout(onSurprise, 120);
          }}
          className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100"
        >
          Random
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button type="button" onClick={handleExplore} className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs text-slate-300">
          Explore
        </button>
        <Link to="/profile" className="rounded-lg border border-white/10 bg-white/[0.04] py-2 text-center text-xs text-slate-300">
          Profile
        </Link>
        {Object.entries(PLAN_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onPlanChange(value)}
            className={`rounded-lg py-2 text-xs font-semibold ${
              plan === value ? 'bg-accent-300 text-slate-950' : 'border border-white/10 bg-white/[0.04] text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}

export default LearningSidebar;
