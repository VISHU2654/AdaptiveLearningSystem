import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SkillBadge from './SkillBadge';
import client from '../api/client';
import { getCourseResource, isCourseLocked } from '../data/courseResources';

const typeGradients = {
  video: 'from-cyan-600 via-sky-600 to-blue-700',
  article: 'from-emerald-600 via-teal-600 to-cyan-700',
  quiz: 'from-violet-600 via-fuchsia-600 to-rose-600',
  exercise: 'from-amber-500 via-orange-600 to-rose-600',
  project: 'from-rose-600 via-pink-600 to-violet-700',
};

const typeIcons = {
  video: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  article: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  quiz: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  exercise: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  project: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
};

function CourseCard({ course, plan = 'free', onStartCourse }) {
  const [clicked, setClicked] = useState(false);
  const gradient = typeGradients[course.content_type] || typeGradients.video;
  const icon = typeIcons[course.content_type] || typeIcons.video;
  const resource = getCourseResource(course);
  const locked = isCourseLocked(course, plan);

  const handleStartLearning = async () => {
    try {
      await client.post('/interactions/', {
        content_id: course.id,
        interaction_type: 'click',
      });
      setClicked(true);
      setTimeout(() => setClicked(false), 2000);
      onStartCourse?.(course);
    } catch (err) {
      console.error('Failed to log interaction:', err);
      onStartCourse?.(course);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="group glass-card overflow-hidden rounded-xl transition-colors duration-300 hover:border-accent-300/40 hover:shadow-[0_24px_70px_rgba(8,145,178,0.18)]"
    >
      <div className={`flex items-center justify-between bg-gradient-to-r ${gradient} px-5 py-4`}>
        <div className="flex items-center space-x-2 text-white/90">
          {icon}
          <span className="text-sm font-medium capitalize">{course.content_type}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
            resource.premium ? 'bg-amber-950/40 text-amber-100' : 'bg-emerald-950/40 text-emerald-100'
          }`}
          >
            {resource.premium ? 'Premium' : 'Free'}
          </span>
          {course.duration_minutes && (
            <span className="rounded-full bg-black/20 px-2 py-1 text-xs text-white/75">
              {course.duration_minutes} min
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-white transition-colors duration-200 group-hover:text-accent-200">
            {course.title}
          </h3>
          {locked && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/25 bg-amber-300/10 text-amber-100" title="Premium course locked">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
          )}
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-slate-400">
          {course.description}
        </p>

        <div className="mb-4 flex items-center justify-between gap-3">
          <SkillBadge level={course.difficulty} />
          <div className="flex flex-wrap justify-end gap-1">
            {(course.topics || []).slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <motion.button
          id={`start-learning-${course.id}`}
          onClick={handleStartLearning}
          whileTap={{ scale: 0.97 }}
          className={`w-full rounded-lg border py-2.5 text-sm font-semibold transition-all duration-200 ${
            locked
              ? 'border-amber-300/25 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15'
              : clicked
              ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
              : 'border-accent-400/25 bg-accent-400/10 text-accent-100 hover:bg-accent-400 hover:text-slate-950 hover:shadow-lg hover:shadow-accent-500/25'
          }`}
        >
          {locked ? 'Preview locked course' : clicked ? 'Opening lesson' : 'Start learning'}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default CourseCard;
