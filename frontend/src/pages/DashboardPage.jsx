import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import SkillBadge from '../components/SkillBadge';
import RecommendationList from '../components/RecommendationList';
import { isCourseLocked } from '../data/courseResources';

function DashboardPage({ searchTerm = '', plan = 'free', surpriseTick = 0, onStartCourse }) {
  const user = useAuthStore((state) => state.user);
  const [courseMap, setCourseMap] = useState({});
  const skillLevel = user?.skill_level || 'beginner';
  const topics = user?.preferred_topics || [];
  const goals = user?.learning_goals || [];

  const availableCourses = useMemo(() => Object.values(courseMap), [courseMap]);

  useEffect(() => {
    if (!surpriseTick || availableCourses.length === 0) {
      return;
    }

    const pool = availableCourses.filter((course) => !isCourseLocked(course, plan));
    const choices = pool.length > 0 ? pool : availableCourses;
    const randomCourse = choices[Math.floor(Math.random() * choices.length)];
    onStartCourse?.(randomCourse);
  }, [surpriseTick, availableCourses, plan, onStartCourse]);

  const rememberCourses = (items) => {
    setCourseMap((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.id] = item;
      });
      return next;
    });
  };

  const stats = [
    { label: 'Skill level', value: skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1) },
    { label: 'Topics', value: topics.length },
    { label: 'Goals', value: goals.length },
    { label: 'Access', value: plan === 'premium' ? 'Premium' : 'Free' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-44 sm:px-6 lg:ml-72 lg:px-8 lg:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className="mb-10"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent-300/80">Adaptive workspace</p>
            <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
              Welcome back, <span className="gradient-text">{user?.full_name || 'Learner'}</span>
            </h1>
            <p className="text-sm text-slate-400 sm:text-base">
              Continue your learning path with real embedded courses and adaptive recommendations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SkillBadge level={skillLevel} />
            {topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="hidden rounded-full border border-accent-400/20 bg-accent-400/10 px-2.5 py-1 text-xs text-accent-200 sm:inline-block"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.28, ease: 'easeOut' }}
              className="glass-card rounded-xl p-4 transition-colors duration-200 hover:border-accent-300/30"
            >
              <div className="mb-3 h-1 w-10 rounded-full bg-gradient-to-r from-primary-400 via-accent-400 to-emerald-400" />
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="text-sm font-semibold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {goals.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {goals.slice(0, 4).map((goal) => (
              <span
                key={goal}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
              >
                {goal}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      <RecommendationList
        endpoint="/recommendations/"
        title="Your recommended courses"
        subtitle="Personalized picks based on your goals, profile, and learning history"
        searchTerm={searchTerm}
        plan={plan}
        onStartCourse={onStartCourse}
        onItemsLoaded={rememberCourses}
      />

      <RecommendationList
        endpoint="/recommendations/trending"
        title="Trending now"
        subtitle="Popular courses across the learning community"
        searchTerm={searchTerm}
        plan={plan}
        onStartCourse={onStartCourse}
        onItemsLoaded={rememberCourses}
      />
    </div>
  );
}

export default DashboardPage;
