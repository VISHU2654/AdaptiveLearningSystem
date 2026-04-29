import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import client from '../api/client';
import CourseCard from './CourseCard';
import SkeletonCourseCard from './SkeletonCourseCard';
import { courseMatchesQuery } from '../data/courseResources';
import { getApiErrorMessage } from '../utils/errors';

function RecommendationList({
  endpoint,
  title,
  subtitle,
  searchTerm = '',
  plan = 'free',
  onStartCourse,
  onItemsLoaded,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get(endpoint);
        const recommendations = response.data.recommendations || [];
        setItems(recommendations);
        onItemsLoaded?.(recommendations);
        setSource(response.data.source || '');
      } catch (err) {
        console.error(`Failed to fetch from ${endpoint}:`, err);
        setError(getApiErrorMessage(err, 'Failed to load recommendations'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endpoint]);

  if (loading) {
    return (
      <section className="mb-12">
        <div className="mb-6">
          <div className="skeleton mb-2 h-7 w-64" />
          <div className="skeleton h-4 w-48" />
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent-300/20 bg-accent-300/10 px-3 py-1 text-xs font-semibold text-accent-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-300" />
            Buffering learning graph
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <SkeletonCourseCard key={i} index={i} />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl py-12 text-center"
        >
          <svg className="mx-auto mb-3 h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-slate-300">{error}</p>
        </motion.div>
      </section>
    );
  }

  const visibleItems = items.filter((item) => courseMatchesQuery(item, searchTerm));

  return (
    <section id={endpoint.includes('trending') ? 'trending' : 'recommendations'} className="mb-12 scroll-mt-24">
      <div className="mb-6">
        <div className="mb-1 flex items-center space-x-3">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {source && (
            <span className="rounded-full border border-accent-400/20 bg-accent-400/10 px-2 py-0.5 text-xs text-accent-200">
              {source === 'model' ? 'AI powered' : 'Popular'}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>

      <AnimatePresence mode="wait">
        {visibleItems.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl py-12 text-center"
          >
            <p className="text-slate-400">
              {searchTerm ? 'No courses match your search yet' : 'No recommendations available yet'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {visibleItems.map((item) => (
              <CourseCard key={item.id} course={item} plan={plan} onStartCourse={onStartCourse} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default RecommendationList;
