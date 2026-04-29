import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import client from '../api/client';
import AuthToast from '../components/AuthToast';
import useAuthStore from '../store/authStore';
import { getApiErrorMessage } from '../utils/errors';

function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_use_tls: true,
    email_delivery_required: true,
    test_recipient: '',
  });
  const [passwordSet, setPasswordSet] = useState(false);
  const [savedSender, setSavedSender] = useState('');
  const [savedFromEmail, setSavedFromEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const normalizedSender = form.smtp_user.trim().toLowerCase();
  const normalizedFromEmail = (form.smtp_from_email || form.smtp_user).trim().toLowerCase();
  const passwordRequired =
    !passwordSet || normalizedSender !== savedSender || normalizedFromEmail !== savedFromEmail;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await client.get('/settings/smtp');
        setForm((prev) => ({
          ...prev,
          smtp_host: res.data.smtp_host || 'smtp.gmail.com',
          smtp_port: res.data.smtp_port || 587,
          smtp_user: res.data.smtp_user || '',
          smtp_password: '',
          smtp_from_email: res.data.smtp_from_email || '',
          smtp_use_tls: res.data.smtp_use_tls,
          email_delivery_required: res.data.email_delivery_required,
          test_recipient: res.data.smtp_user || '',
        }));
        setPasswordSet(res.data.smtp_password_set);
        setSavedSender((res.data.smtp_user || '').trim().toLowerCase());
        setSavedFromEmail((res.data.smtp_from_email || res.data.smtp_user || '').trim().toLowerCase());
      } catch (err) {
        setToast({
          message: getApiErrorMessage(err, 'Could not load email settings.'),
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.is_admin) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setToast({ message: '', type: 'success' });
    setSaving(true);

    try {
      const res = await client.post('/settings/smtp', {
        ...form,
        smtp_port: Number(form.smtp_port),
      });
      setPasswordSet(true);
      setSavedSender(normalizedSender);
      setSavedFromEmail(normalizedFromEmail);
      setToast({
        message: res.data.message,
        type: res.data.success ? 'success' : 'error',
      });
      setForm((prev) => ({ ...prev, smtp_password: '' }));
    } catch (err) {
      setToast({
        message: getApiErrorMessage(err, 'Could not save email settings.'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-44 sm:px-6 lg:ml-72 lg:px-8 lg:pt-20">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">Admin access is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-44 sm:px-6 lg:ml-72 lg:px-8 lg:pt-20">
      <AuthToast message={toast.message} type={toast.type} />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-card rounded-2xl p-8"
      >
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Email sender</h1>
            <p className="mt-2 text-sm text-slate-400">
              Configure the account this app uses to send signup and login OTP emails.
            </p>
          </div>
          <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
            passwordSet
              ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
              : 'border-amber-300/25 bg-amber-300/10 text-amber-100'
          }`}>
            {passwordSet ? 'Sender saved' : 'Setup needed'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid gap-5">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50">
              Gmail setup: use `smtp.gmail.com`, port `587`, TLS checked, and paste a Google App Password from the same account as the sender email.
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_9rem]">
              <div>
                <label htmlFor="smtp_host" className="mb-1.5 block text-sm font-medium text-slate-200">
                  SMTP host
                </label>
                <input
                  id="smtp_host"
                  value={form.smtp_host}
                  onChange={(e) => updateField('smtp_host', e.target.value)}
                  className="input-field"
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="smtp_port" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Port
                </label>
                <input
                  id="smtp_port"
                  type="number"
                  value={form.smtp_port}
                  onChange={(e) => updateField('smtp_port', e.target.value)}
                  className="input-field"
                  min="1"
                  max="65535"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="smtp_user" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Sender email
                </label>
                <input
                  id="smtp_user"
                  type="email"
                  value={form.smtp_user}
                  onChange={(e) => {
                    updateField('smtp_user', e.target.value);
                    if (!form.test_recipient) {
                      updateField('test_recipient', e.target.value);
                    }
                  }}
                  className="input-field"
                  placeholder="your-email@gmail.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="smtp_from_email" className="mb-1.5 block text-sm font-medium text-slate-200">
                  From email
                </label>
                <input
                  id="smtp_from_email"
                  type="email"
                  value={form.smtp_from_email}
                  onChange={(e) => updateField('smtp_from_email', e.target.value)}
                  className="input-field"
                  placeholder="your-email@gmail.com"
                />
                {normalizedFromEmail && normalizedSender && normalizedFromEmail !== normalizedSender && (
                  <p className="mt-1.5 text-xs text-amber-200">
                    Gmail works best when From email matches Sender email.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="smtp_password" className="mb-1.5 block text-sm font-medium text-slate-200">
                  App password
                </label>
                <input
                  id="smtp_password"
                  type="password"
                  value={form.smtp_password}
                  onChange={(e) => updateField('smtp_password', e.target.value)}
                  className="input-field"
                  placeholder={passwordRequired ? 'Paste the 16-character Google App Password' : 'Leave blank to keep current password'}
                  required={passwordRequired}
                  autoComplete="new-password"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  {passwordRequired
                    ? 'Required because this sender is new or changed.'
                    : 'Leave blank only if you are keeping the same sender.'}
                </p>
              </div>
              <div>
                <label htmlFor="test_recipient" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Test recipient
                </label>
                <input
                  id="test_recipient"
                  type="email"
                  value={form.test_recipient}
                  onChange={(e) => updateField('test_recipient', e.target.value)}
                  className="input-field"
                  placeholder="where to send the test email"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.smtp_use_tls}
                  onChange={(e) => updateField('smtp_use_tls', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent-400"
                />
                Use TLS
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.email_delivery_required}
                  onChange={(e) => updateField('email_delivery_required', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-accent-400"
                />
                Require email delivery
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
            >
              {saving && (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span>{saving ? 'Saving...' : 'Save and send test'}</span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default SettingsPage;
