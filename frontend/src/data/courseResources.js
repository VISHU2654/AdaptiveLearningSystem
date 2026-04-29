const RESOURCE_BY_TOPIC = {
  python: {
    provider: 'freeCodeCamp',
    title: 'Python for Beginners',
    embedUrl: 'https://www.youtube.com/embed/rfscVS0vtbw',
    sourceUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '4h 26m',
    premium: false,
    summary: 'A practical beginner-friendly Python course covering syntax, control flow, functions, and projects.',
  },
  javascript: {
    provider: 'freeCodeCamp',
    title: 'JavaScript Full Course',
    embedUrl: 'https://www.youtube.com/embed/PkZNo7MFNFg',
    sourceUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '3h 26m',
    premium: false,
    summary: 'A complete JavaScript primer for variables, functions, DOM work, and browser-based practice.',
  },
  'web-development': {
    provider: 'freeCodeCamp',
    title: 'React Course for Beginners',
    embedUrl: 'https://www.youtube.com/embed/bMknfKXIFA8',
    sourceUrl: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '11h 55m',
    premium: false,
    summary: 'An in-depth React course with components, props, state, effects, and application building.',
  },
  'machine-learning': {
    provider: 'freeCodeCamp',
    title: 'Machine Learning for Everybody',
    embedUrl: 'https://www.youtube.com/embed/i_LwzRVP7bg',
    sourceUrl: 'https://www.youtube.com/watch?v=i_LwzRVP7bg',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '3h 53m',
    premium: true,
    summary: 'A guided machine-learning introduction covering models, data, evaluation, and applied examples.',
  },
  'data-science': {
    provider: 'Harvard CS50',
    title: 'CS50x Introduction to Computer Science',
    embedUrl: 'https://www.youtube.com/embed/8mAITcNt710',
    sourceUrl: 'https://www.youtube.com/watch?v=8mAITcNt710',
    referenceUrl: 'https://cs50.harvard.edu/x/',
    durationLabel: '26h+',
    premium: true,
    summary: 'Harvard CS50x materials introduce computational thinking, programming, algorithms, and data.',
  },
};

export const PLAN_LABELS = {
  free: 'Free',
  premium: 'Premium',
};

export function getCourseResource(course) {
  const topics = course?.topics || [];
  const topicResource = topics.map((topic) => RESOURCE_BY_TOPIC[topic]).find(Boolean);
  const resource = topicResource || RESOURCE_BY_TOPIC.python;
  const advancedPremium = course?.difficulty === 'advanced' || course?.content_type === 'project';

  return {
    ...resource,
    title: resource.title,
    premium: resource.premium || advancedPremium,
  };
}

export function isCourseLocked(course, plan) {
  return plan !== 'premium' && getCourseResource(course).premium;
}

export function courseMatchesQuery(course, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    course.title,
    course.description,
    course.content_type,
    course.difficulty,
    ...(course.topics || []),
    ...(course.skills_taught || []),
    ...(course.learning_objectives || []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}
