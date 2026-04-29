import React from 'react';
import { motion } from 'framer-motion';

function SkeletonCourseCard({ index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: 'easeOut' }}
      className="glass-card overflow-hidden rounded-xl"
    >
      <div className="skeleton h-16 rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
        <div className="flex justify-between">
          <div className="skeleton h-5 w-20" />
          <div className="skeleton h-5 w-16" />
        </div>
        <div className="skeleton h-10 w-full rounded-lg" />
      </div>
    </motion.div>
  );
}

export default SkeletonCourseCard;
