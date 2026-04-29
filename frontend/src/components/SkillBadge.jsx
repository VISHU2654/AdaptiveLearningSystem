import React from 'react';

const colorMap = {
  beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  advanced: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

function SkillBadge({ level }) {
  const classes = colorMap[level] || colorMap.beginner;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${classes} transition-all duration-200`}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

export default SkillBadge;
