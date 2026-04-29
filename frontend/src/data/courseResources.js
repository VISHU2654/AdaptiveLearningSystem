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
  java: {
    provider: 'freeCodeCamp',
    title: 'Java Programming Full Course',
    embedUrl: 'https://www.youtube.com/embed/GoXwIVyNvX0',
    sourceUrl: 'https://www.youtube.com/watch?v=GoXwIVyNvX0',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '9h 35m',
    premium: false,
    summary: 'A comprehensive Java course covering OOP, collections, exceptions, and real-world projects.',
  },
  cpp: {
    provider: 'freeCodeCamp',
    title: 'C++ Tutorial for Beginners',
    embedUrl: 'https://www.youtube.com/embed/vLnPwxZdW4Y',
    sourceUrl: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '4h 01m',
    premium: false,
    summary: 'Full C++ beginner course covering syntax, pointers, OOP, and memory management fundamentals.',
  },
  go: {
    provider: 'freeCodeCamp',
    title: 'Go Programming – Golang Course',
    embedUrl: 'https://www.youtube.com/embed/un6ZyFkqFKo',
    sourceUrl: 'https://www.youtube.com/watch?v=un6ZyFkqFKo',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '6h 40m',
    premium: false,
    summary: 'Learn Go from scratch — goroutines, channels, structs, interfaces, and concurrent programming.',
  },
  rust: {
    provider: 'freeCodeCamp',
    title: 'Rust Programming Course',
    embedUrl: 'https://www.youtube.com/embed/BpPEoZW5IiY',
    sourceUrl: 'https://www.youtube.com/watch?v=BpPEoZW5IiY',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '14h',
    premium: true,
    summary: 'Complete Rust course covering ownership, borrowing, lifetimes, traits, and systems programming.',
  },
  typescript: {
    provider: 'freeCodeCamp',
    title: 'TypeScript Full Course',
    embedUrl: 'https://www.youtube.com/embed/30LWjhZzg50',
    sourceUrl: 'https://www.youtube.com/watch?v=30LWjhZzg50',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '5h 02m',
    premium: false,
    summary: 'Master TypeScript: types, interfaces, generics, and integrating with React and Node.js projects.',
  },
  sql: {
    provider: 'freeCodeCamp',
    title: 'SQL Full Course',
    embedUrl: 'https://www.youtube.com/embed/HXV3zeQKqGY',
    sourceUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '4h 20m',
    premium: false,
    summary: 'Learn SQL from scratch — queries, joins, aggregations, and database design fundamentals.',
  },
  kotlin: {
    provider: 'freeCodeCamp',
    title: 'Kotlin Course for Beginners',
    embedUrl: 'https://www.youtube.com/embed/F9UC9DY-vIU',
    sourceUrl: 'https://www.youtube.com/watch?v=F9UC9DY-vIU',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '2h 38m',
    premium: false,
    summary: 'Kotlin basics for Android development — syntax, functions, classes, and Kotlin-specific features.',
  },
  swift: {
    provider: 'freeCodeCamp',
    title: 'Swift Programming Tutorial',
    embedUrl: 'https://www.youtube.com/embed/comQ1-x2a1Q',
    sourceUrl: 'https://www.youtube.com/watch?v=comQ1-x2a1Q',
    referenceUrl: 'https://www.freecodecamp.org/',
    durationLabel: '3h 39m',
    premium: true,
    summary: 'Learn Swift for iOS development — optionals, closures, protocols, and SwiftUI basics.',
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
