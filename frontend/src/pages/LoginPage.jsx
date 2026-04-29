import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import AuthToast from '../components/AuthToast';
import useAuthStore from '../store/authStore';
import { getApiErrorMessage } from '../utils/errors';

const DEMO_LOGINS = [
  { label: 'Student demo', email: 'student@example.com', password: 'student123' },
  { label: 'Admin demo', email: 'admin@example.com', password: 'admin123' },
];

const cardMotion = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [demoLoading, setDemoLoading] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const completeLogin = async (token) => {
    const profileRes = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAuth(token, profileRes.data);
    navigate(profileRes.data.is_admin ? '/settings' : '/dashboard');
  };

  const requestLoginOtp = async (loginEmail = email, loginPassword = password) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', loginEmail.trim());
      formData.append('password', loginPassword);

      const loginRes = await client.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (loginRes.data.access_token) {
        await completeLogin(loginRes.data.access_token);
        return;
      }
      setPendingEmail(loginRes.data.email || loginEmail.trim().toLowerCase());
      setOtp('');
      setSuccess(loginRes.data.message || 'A login OTP has been sent to your email.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await requestLoginOtp();
  };

  const handleDemoLogin = async (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setDemoLoading(demo.email);
    try {
      await requestLoginOtp(demo.email, demo.password);
    } finally {
      setDemoLoading('');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerifying(true);

    try {
      const verifyRes = await client.post('/auth/verify-otp', {
        email: pendingEmail,
        otp,
      });
      await completeLogin(verifyRes.data.access_token);
    } catch (err) {
      setError(getApiErrorMessage(err, 'OTP verification failed. Please try again.'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await requestLoginOtp();
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <AuthToast message={error || success} type={error ? 'error' : 'success'} />

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
          <h1 className="mb-2 text-3xl font-bold tracking-normal text-white">
            {pendingEmail ? 'Enter OTP' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-300">
            {pendingEmail ? pendingEmail : 'Sign in to your adaptive learning workspace'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {pendingEmail ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="login_otp" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Email OTP
                </label>
                <input
                  id="login_otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-2xl font-semibold tracking-[0.35em]"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={6}
                />
              </div>

              <motion.button
                id="login-otp-submit"
                type="submit"
                disabled={verifying || otp.length !== 6}
                aria-busy={verifying}
                whileHover={verifying ? {} : { y: -1 }}
                whileTap={verifying ? {} : { scale: 0.98 }}
                className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying && (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <span>{verifying ? 'Verifying...' : 'Verify login'}</span>
              </motion.button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || loading}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending || loading ? 'Sending...' : 'Send another code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingEmail('');
                  setOtp('');
                  setSuccess('');
                  setError('');
                }}
                className="w-full text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
              >
                Use a different account
              </button>
            </form>
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-accent-400/20 bg-accent-400/10 p-4">
                <p className="text-sm font-semibold text-white">Email OTP sign-in</p>
                <p className="mt-1 text-xs text-slate-300">
                  Use the email address you registered with. A one-time code will be sent before your workspace opens.
                </p>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DEMO_LOGINS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleDemoLogin(demo)}
                    disabled={loading || Boolean(demoLoading)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {demoLoading === demo.email ? 'Opening...' : demo.label}
                  </button>
                ))}
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
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-300">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-accent-300 transition-colors hover:text-accent-200">
                Create one
              </Link>
            </p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default LoginPage;
