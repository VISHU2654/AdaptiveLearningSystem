import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import AuthToast from '../components/AuthToast';
import useAuthStore from '../store/authStore';
import { getApiErrorMessage } from '../utils/errors';

const cardMotion = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const DEMO_USER = {
  email: 'student@example.com',
  password: 'student123',
  name: 'Alice Johnson',
  skill: 'Beginner',
  topics: ['python', 'web-development'],
  goals: ['Learn web development basics', 'Understand Python syntax'],
};

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const loginRes = await client.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const token = loginRes.data.access_token;

      const profileRes = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAuth(token, profileRes.data);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = () => {
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
    setError('');
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuthToast message={error} />

      <motion.div
        variants={cardMotion}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotate: -8, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.5, type: 'spring', stiffness: 180 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-accent-500 to-emerald-400 shadow-xl shadow-cyan-950/40"
          >
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </motion.div>
          <h1 className="mb-2 text-3xl font-bold tracking-normal text-white">Welcome back</h1>
          <p className="text-sm text-slate-300">Sign in to your adaptive learning workspace</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6 rounded-xl border border-accent-400/20 bg-accent-400/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{DEMO_USER.name}</p>
                <p className="mt-1 text-xs text-slate-300">
                  {DEMO_USER.skill} learner with Python and web-development interests
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemoUser}
                className="shrink-0 rounded-lg border border-accent-300/30 bg-accent-300/15 px-3 py-1.5 text-xs font-semibold text-accent-100 transition-colors hover:bg-accent-300/25"
              >
                Use demo
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_USER.goals.map((goal) => (
                <span key={goal} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs text-emerald-100">
                  {goal}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <motion.button
              id="login-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              whileHover={loading ? {} : { y: -1 }}
              whileTap={loading ? {} : { scale: 0.98 }}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-300">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-accent-300 transition-colors hover:text-accent-200">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Demo: <span className="text-slate-300">{DEMO_USER.email}</span> / <span className="text-slate-300">{DEMO_USER.password}</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
