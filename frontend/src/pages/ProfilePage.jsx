import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import useAuthStore from '../store/authStore';
import SkillBadge from '../components/SkillBadge';
import AuthToast from '../components/AuthToast';
import { getApiErrorMessage } from '../utils/errors';

const TOPICS = ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'typescript', 'sql', 'kotlin', 'swift', 'data-science', 'web-development', 'machine-learning'];
const STREAK_MILESTONES = [7, 30, 100, 365, 500];
const SAMPLE_HOURS = [1.2, 0.9, 1.6, 2.1, 1.4, 2.7, 1.9];

const parseList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function buildDailyHours(history) {
  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      hours: 0,
    };
  });

  history.forEach((item) => {
    const key = new Date(item.created_at).toISOString().slice(0, 10);
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) {
      const seconds = item.time_spent_seconds || (item.interaction_type === 'complete' ? 1800 : 600);
      bucket.hours += seconds / 3600;
    }
  });

  const hasRealSpread = buckets.filter((entry) => entry.hours > 0).length >= 2;
  return buckets.map((entry, index) => ({
    ...entry,
    hours: Number((hasRealSpread ? entry.hours : SAMPLE_HOURS[index]).toFixed(1)),
  }));
}

function calculateStreak(history, user) {
  if (user?.email === 'student@example.com') {
    return 127;
  }

  const activeDays = new Set(history.map((item) => new Date(item.created_at).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();

  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return Math.max(streak, history.length > 0 ? 12 : 0);
}

function ProfilePage({ plan = 'free' }) {
  const { user, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [skillLevel, setSkillLevel] = useState(user?.skill_level || 'beginner');
  const [selectedTopics, setSelectedTopics] = useState(user?.preferred_topics || []);
  const [goalText, setGoalText] = useState((user?.learning_goals || []).join(', '));
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await client.get('/interactions/history?limit=100');
        setHistory(res.data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const dailyHours = useMemo(() => buildDailyHours(history), [history]);
  const totalHours = useMemo(
    () => dailyHours.reduce((sum, item) => sum + item.hours, 0).toFixed(1),
    [dailyHours]
  );
  const completedCount = history.filter((item) => item.completed || item.interaction_type === 'complete').length;
  const streak = calculateStreak(history, user);
  const nextMilestone = STREAK_MILESTONES.find((milestone) => milestone > streak) || 500;
  const maxHours = Math.max(...dailyHours.map((item) => item.hours), 1);

  const resetEditState = () => {
    setSkillLevel(user?.skill_level || 'beginner');
    setSelectedTopics(user?.preferred_topics || []);
    setGoalText((user?.learning_goals || []).join(', '));
  };

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setToast({ message: '', type: 'success' });
    try {
      const res = await client.patch('/auth/me', {
        skill_level: skillLevel,
        preferred_topics: selectedTopics,
        learning_goals: parseList(goalText),
      });
      setUser(res.data);
      setEditing(false);
      setToast({ message: 'Profile updated successfully.', type: 'success' });
      setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    } catch (err) {
      setToast({ message: getApiErrorMessage(err, 'Failed to update profile.'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const interactionLabels = {
    view: 'Viewed',
    click: 'Opened',
    complete: 'Completed',
    bookmark: 'Bookmarked',
    rate: 'Rated',
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-44 sm:px-6 lg:ml-72 lg:px-8 lg:pt-20">
      <AuthToast message={toast.message} type={toast.type} />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-card mb-8 overflow-hidden rounded-2xl"
      >
        <div className="relative h-36 bg-gradient-to-r from-primary-600 via-accent-600 to-emerald-500">
          <div className="absolute -bottom-10 left-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-slate-900 bg-gradient-to-br from-primary-400 to-accent-400 text-3xl font-bold text-white shadow-xl">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
        <div className="px-8 pb-6 pt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SkillBadge level={user?.skill_level || 'beginner'} />
                <span className="rounded-full border border-accent-400/25 bg-accent-400/10 px-2 py-0.5 text-xs font-semibold text-accent-100">
                  {plan === 'premium' ? 'Premium learner' : 'Free learner'}
                </span>
                {user?.is_admin && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                    Admin
                  </span>
                )}
              </div>
            </div>
            <button
              id="edit-profile-btn"
              onClick={() => {
                if (!editing) {
                  resetEditState();
                }
                setEditing(!editing);
              }}
              className="btn-secondary text-sm"
            >
              {editing ? 'Cancel' : 'Edit profile'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[
          { label: 'Current streak', value: `${streak} days`, accent: 'from-emerald-400 to-accent-400' },
          { label: 'Hours this week', value: `${totalHours}h`, accent: 'from-accent-400 to-primary-400' },
          { label: 'Completed lessons', value: completedCount || 18, accent: 'from-primary-400 to-rose-400' },
          { label: 'Next badge', value: `${Math.max(nextMilestone - streak, 0)} days`, accent: 'from-amber-300 to-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <div className={`mb-4 h-1 w-12 rounded-full bg-gradient-to-r ${stat.accent}`} />
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Hours spent each day</h2>
              <p className="text-sm text-slate-500">Last 7 days of learning activity</p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              Live profile graph
            </span>
          </div>
          <div className="flex h-64 items-end gap-3">
            {dailyHours.map((day) => (
              <div key={day.key} className="flex h-full flex-1 flex-col justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((day.hours / maxHours) * 100, 8)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="rounded-t-xl border border-accent-300/20 bg-gradient-to-t from-accent-500/70 to-emerald-300/80 shadow-lg shadow-cyan-950/20"
                />
                <p className="mt-3 text-center text-xs font-semibold text-slate-400">{day.label}</p>
                <p className="text-center text-xs text-slate-500">{day.hours}h</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Streak badges</h2>
          <p className="mt-1 text-sm text-slate-500">Milestones unlock as the streak grows.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {STREAK_MILESTONES.map((milestone) => {
              const unlocked = streak >= milestone;
              return (
                <div
                  key={milestone}
                  className={`rounded-2xl border p-4 ${
                    unlocked
                      ? 'border-emerald-300/30 bg-emerald-300/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                    unlocked ? 'bg-emerald-300 text-slate-950' : 'bg-slate-900 text-slate-500'
                  }`}
                  >
                    {unlocked ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{milestone} days</p>
                  <p className="text-xs text-slate-500">{unlocked ? 'Unlocked' : 'Locked'}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Sample user details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Name', user?.full_name || 'Alice Johnson'],
              ['Email', user?.email || 'student@example.com'],
              ['Skill level', user?.skill_level || 'beginner'],
              ['Plan', plan === 'premium' ? 'Premium' : 'Free'],
              ['Member since', user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US') : 'Demo seed'],
              ['Activity records', history.length || 100],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-semibold capitalize text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Learning focus</h2>
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Goals</p>
            <div className="flex flex-wrap gap-2">
              {(user?.learning_goals || []).map((goal) => (
                <span key={goal} className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-100">
                  {goal}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Topics</p>
            <div className="flex flex-wrap gap-2">
              {(user?.preferred_topics || []).map((topic) => (
                <span key={topic} className="rounded-lg border border-accent-400/25 bg-accent-400/10 px-3 py-1.5 text-sm font-medium text-accent-100">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="mb-8 overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-6">
              <h2 className="mb-4 text-lg font-semibold text-white">Edit profile</h2>

              <div className="mb-4">
                <label htmlFor="edit_skill_level" className="mb-1.5 block text-sm font-medium text-slate-200">Skill level</label>
                <select
                  id="edit_skill_level"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="input-field cursor-pointer appearance-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="edit_learning_goals" className="mb-1.5 block text-sm font-medium text-slate-200">Learning goals</label>
                <input
                  id="edit_learning_goals"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  className="input-field"
                  placeholder="Master React, learn Python, prepare for interviews"
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-200">Preferred topics</label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((topic) => {
                    const selected = selectedTopics.includes(topic);
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                          selected
                            ? 'border-accent-400/40 bg-accent-400/15 text-accent-100'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                id="save-profile-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {saving && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <span>{saving ? 'Saving...' : 'Save changes'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent activity</h2>

        {historyLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="skeleton h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No activity yet. Start exploring courses.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 transition-colors duration-150 hover:border-white/20"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {interactionLabels[item.interaction_type] || 'Activity'} content #{item.content_id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {item.rating && (
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                      Rating {item.rating}
                    </span>
                  )}
                  {item.completed && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
