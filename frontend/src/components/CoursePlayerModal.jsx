import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import { getCourseResource, isCourseLocked } from '../data/courseResources';

function CoursePlayerModal({ course, plan, onClose, onUpgrade }) {
  const [buffering, setBuffering] = useState(true);
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState(false);
  const resource = useMemo(() => (course ? getCourseResource(course) : null), [course]);
  const locked = course ? isCourseLocked(course, plan) : false;

  useEffect(() => {
    if (!course) {
      return undefined;
    }

    setBuffering(true);
    setCompleted(false);
    setNotes('');

    const timer = window.setTimeout(() => setBuffering(false), 900);
    client
      .post('/interactions/', {
        content_id: course.id,
        interaction_type: 'view',
        time_spent_seconds: 300,
      })
      .catch((err) => console.error('Failed to log view:', err));

    return () => window.clearTimeout(timer);
  }, [course]);

  const markComplete = async () => {
    if (!course) {
      return;
    }

    try {
      await client.post('/interactions/', {
        content_id: course.id,
        interaction_type: 'complete',
        time_spent_seconds: Math.max((course.duration_minutes || 25) * 60, 600),
      });
      setCompleted(true);
    } catch (err) {
      console.error('Failed to mark course complete:', err);
    }
  };

  return (
    <AnimatePresence>
      {course && resource && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xl sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="glass-card flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent-300/20 bg-accent-300/10 px-2.5 py-1 text-xs font-semibold text-accent-100">
                    {resource.provider}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    resource.premium
                      ? 'border-amber-300/25 bg-amber-300/10 text-amber-100'
                      : 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
                  }`}
                  >
                    {resource.premium ? 'Premium' : 'Free'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white sm:text-xl">{course.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{resource.summary}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close course player"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_21rem]">
              <div className="p-4 sm:p-5">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
                  {buffering && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80">
                      <div className="mb-4 flex gap-2">
                        {[0, 1, 2].map((item) => (
                          <span
                            key={item}
                            className="h-3 w-3 animate-bounce rounded-full bg-accent-300"
                            style={{ animationDelay: `${item * 120}ms` }}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-white">Buffering interactive course</p>
                      <p className="mt-1 text-xs text-slate-500">Preparing notes, progress, and recommendations</p>
                    </div>
                  )}

                  {locked ? (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-100">
                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-white">Premium course locked</h3>
                      <p className="mt-2 max-w-md text-sm text-slate-400">
                        Switch to Premium in the sidebar to unlock advanced and project-based courses for the demo.
                      </p>
                      <button type="button" onClick={onUpgrade} className="btn-primary mt-5">
                        Unlock premium preview
                      </button>
                    </div>
                  ) : (
                    <iframe
                      title={resource.title}
                      src={resource.embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">Provider</p>
                    <p className="mt-1 text-sm font-semibold text-white">{resource.provider}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">Course length</p>
                    <p className="mt-1 text-sm font-semibold text-white">{resource.durationLabel}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs text-slate-500">Difficulty</p>
                    <p className="mt-1 text-sm font-semibold capitalize text-white">{course.difficulty}</p>
                  </div>
                </div>
              </div>

              <aside className="border-t border-white/10 p-4 sm:p-5 lg:border-l lg:border-t-0">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="text-sm font-semibold text-white">Learning objectives</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {(course.learning_objectives || []).slice(0, 4).map((objective) => (
                      <li key={objective} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-300" />
                        {objective}
                      </li>
                    ))}
                    {(course.learning_objectives || []).length === 0 && (
                      <li>Watch the lesson, take notes, and mark completion when finished.</li>
                    )}
                  </ul>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <label htmlFor="course-notes" className="text-sm font-semibold text-white">Notes</label>
                  <textarea
                    id="course-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field mt-3 min-h-28 resize-none text-sm"
                    placeholder="Capture takeaways, doubts, or project ideas..."
                  />
                </div>

                <button
                  type="button"
                  onClick={markComplete}
                  disabled={locked || completed}
                  className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {completed ? 'Marked complete' : 'Mark lesson complete'}
                </button>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Disclaimer: embedded lessons are provided by their original creators. Use the source link for official descriptions, licensing, and updates.
                </p>
                <a
                  href={resource.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-accent-300 hover:text-accent-200"
                >
                  View original course source
                </a>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CoursePlayerModal;
