import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import client from '../api/client';
import AuthToast from '../components/AuthToast';
import useAuthStore from '../store/authStore';
import { getApiErrorMessage } from '../utils/errors';

const TOPICS = ['python', 'javascript', 'data-science', 'web-development', 'machine-learning'];

const SAMPLE_PROFILE = {
  full_name: 'Riya Sharma',
  password: 'demo12345',
  skill_level: 'intermediate',
  preferred_topics: ['javascript', 'machine-learning'],
  learning_goals: 'Build a recommendation dashboard, strengthen React skills, understand ML ranking',
};

const cardMotion = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const parseList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    skill_level: 'beginner',
    preferred_topics: [],
    learning_goals: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const completeLogin = async (token) => {
    const profileRes = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAuth(token, profileRes.data);
    navigate('/dashboard');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleTopic = (topic) => {
    setForm((prev) => ({
      ...prev,
      preferred_topics: prev.preferred_topics.includes(topic)
        ? prev.preferred_topics.filter((t) => t !== topic)
        : [...prev.preferred_topics, topic],
    }));
  };

  const fillSampleProfile = () => {
    setForm({
      full_name: SAMPLE_PROFILE.full_name,
      email: form.email,
      password: SAMPLE_PROFILE.password,
      confirmPassword: SAMPLE_PROFILE.password,
      skill_level: SAMPLE_PROFILE.skill_level,
      preferred_topics: SAMPLE_PROFILE.preferred_topics,
      learning_goals: SAMPLE_PROFILE.learning_goals,
    });
    setError('');
    setSuccess('');
  };

  const handleDemoSignup = async () => {
    setError('');
    setSuccess('');
    setDemoLoading(true);

    try {
      const demoRes = await client.post('/auth/demo-register');
      await completeLogin(demoRes.data.access_token);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Demo signup is unavailable right now.'));
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await client.post('/auth/register', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        skill_level: form.skill_level,
        preferred_topics: form.preferred_topics,
        learning_goals: parseList(form.learning_goals),
      });

      setPendingEmail(form.email.trim().toLowerCase());
      setOtp('');
      setSuccess('Verification code sent. Check your email to finish creating the account.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
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
    setError('');
    setSuccess('');
    setResending(true);

    try {
      await client.post('/auth/resend-otp', { email: pendingEmail });
      setSuccess('A new verification code has been sent to your email.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not resend OTP. Please try again.'));
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
        className="relative z-10 w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ rotate: 8, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.5, type: 'spring', stiffness: 180 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-accent-500 to-emerald-400 shadow-xl shadow-cyan-950/40"
          >
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </motion.div>
          <h1 className="mb-2 text-3xl font-bold tracking-normal text-white">
            {pendingEmail ? 'Verify email' : 'Create account'}
          </h1>
          <p className="text-sm text-slate-300">
            {pendingEmail ? pendingEmail : 'Shape a learning path around your goals'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {pendingEmail ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="register_otp" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Email OTP
                </label>
                <input
                  id="register_otp"
                  name="otp"
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
                <span>{verifying ? 'Verifying...' : 'Verify and continue'}</span>
              </motion.button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Resend code'}
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
                Change email
              </button>
            </form>
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-accent-400/20 bg-accent-400/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Sample learner profile</p>
                    <p className="mt-1 text-xs text-slate-300">
                      Intermediate learner focused on React, ML ranking, and recommendation dashboards
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fillSampleProfile}
                    className="shrink-0 rounded-lg border border-accent-300/30 bg-accent-300/15 px-3 py-1.5 text-xs font-semibold text-accent-100 transition-colors hover:bg-accent-300/25"
                  >
                    Fill sample
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDemoSignup}
                  disabled={demoLoading || loading}
                  className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {demoLoading ? 'Opening demo...' : 'Continue as demo learner'}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-slate-200">Full name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                className="input-field"
                placeholder="John Doe"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="reg_email" className="mb-1.5 block text-sm font-medium text-slate-200">Email</label>
              <input
                id="reg_email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="reg_password" className="mb-1.5 block text-sm font-medium text-slate-200">Password</label>
                <input
                  id="reg_password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-slate-200">Confirm</label>
                <input
                  id="confirm_password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="skill_level" className="mb-1.5 block text-sm font-medium text-slate-200">Skill level</label>
              <select
                id="skill_level"
                name="skill_level"
                value={form.skill_level}
                onChange={handleChange}
                className="input-field cursor-pointer appearance-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="learning_goals" className="mb-1.5 block text-sm font-medium text-slate-200">
                Learning goals
              </label>
              <input
                id="learning_goals"
                name="learning_goals"
                type="text"
                value={form.learning_goals}
                onChange={handleChange}
                className="input-field"
                placeholder="Master React, learn Python, prepare for interviews"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Preferred topics</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => {
                  const selected = form.preferred_topics.includes(topic);
                  return (
                    <motion.button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                        selected
                          ? 'border-accent-400/40 bg-accent-400/15 text-accent-100'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {topic}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <motion.button
              id="register-submit"
              type="submit"
              disabled={loading}
              aria-busy={loading}
              whileHover={loading ? {} : { y: -1 }}
              whileTap={loading ? {} : { scale: 0.98 }}
              className="btn-primary mt-2 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>{loading ? 'Creating account...' : 'Create account'}</span>
            </motion.button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-300">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent-300 transition-colors hover:text-accent-200">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
