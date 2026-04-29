import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useAuthStore from '../store/authStore';

const KNOWLEDGE_BASE = {
  python: {
    description: 'Python is a versatile, beginner-friendly language used in web dev, data science, ML, and automation.',
    concepts: ['variables', 'loops', 'functions', 'classes', 'decorators', 'generators', 'list comprehensions'],
    resources: [
      { title: 'Python Official Docs', url: 'https://docs.python.org/3/' },
      { title: 'freeCodeCamp Python', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/' },
      { title: 'Real Python Tutorials', url: 'https://realpython.com/' },
    ],
    qa: {
      'what is a list comprehension': 'A concise way to create lists: `[x**2 for x in range(10)]`. It combines a loop and expression in one line.',
      'how to read a file': 'Use `with open("file.txt", "r") as f: content = f.read()`. The `with` statement auto-closes the file.',
      'what is a decorator': 'A function that wraps another function to extend its behavior: `@my_decorator` above a function definition.',
      'difference between list and tuple': 'Lists are mutable (changeable), tuples are immutable. Use tuples for fixed data, lists for collections you modify.',
    },
    roadmap: '1. Variables & data types → 2. Control flow (if/for/while) → 3. Functions → 4. OOP (classes) → 5. File I/O → 6. Libraries (requests, pandas) → 7. Projects',
  },
  javascript: {
    description: 'JavaScript powers the web — both frontend (React, Vue) and backend (Node.js). Essential for web developers.',
    concepts: ['closures', 'promises', 'async/await', 'DOM manipulation', 'ES6+', 'event loop', 'prototypes'],
    resources: [
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
      { title: 'JavaScript.info', url: 'https://javascript.info/' },
      { title: 'freeCodeCamp JS', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/' },
    ],
    qa: {
      'what is a closure': 'A closure is a function that remembers variables from its outer scope even after the outer function has returned.',
      'difference between let const var': '`var` is function-scoped, `let` and `const` are block-scoped. `const` cannot be reassigned.',
      'what is the event loop': 'The event loop processes async callbacks from the task queue after the call stack is empty, enabling non-blocking I/O.',
      'what is a promise': 'A Promise represents an async operation that will resolve with a value or reject with an error. Chain with `.then()` or use `async/await`.',
    },
    roadmap: '1. Syntax & basics → 2. DOM manipulation → 3. ES6+ features → 4. Async JS (promises, async/await) → 5. React or Vue → 6. Node.js → 7. Full-stack projects',
  },
  java: {
    description: 'Java is a robust, object-oriented language used for enterprise apps, Android development, and backend systems.',
    concepts: ['OOP', 'interfaces', 'generics', 'streams', 'multithreading', 'JVM', 'Spring Boot'],
    resources: [
      { title: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
      { title: 'Baeldung', url: 'https://www.baeldung.com/' },
      { title: 'freeCodeCamp Java', url: 'https://www.youtube.com/watch?v=GoXwIVyNvX0' },
    ],
    qa: {
      'what is jvm': 'The Java Virtual Machine executes Java bytecode, enabling "write once, run anywhere" cross-platform compatibility.',
      'difference between abstract class and interface': 'Abstract classes can have state and constructors; interfaces define contracts with default methods (Java 8+).',
    },
    roadmap: '1. Syntax & OOP → 2. Collections & Generics → 3. Exception handling → 4. File I/O & Streams → 5. Multithreading → 6. Spring Boot → 7. Enterprise projects',
  },
  cpp: {
    description: 'C++ is a high-performance language for systems programming, game engines, and competitive programming.',
    concepts: ['pointers', 'references', 'RAII', 'templates', 'STL', 'smart pointers', 'move semantics'],
    resources: [
      { title: 'cppreference.com', url: 'https://en.cppreference.com/' },
      { title: 'LearnCpp.com', url: 'https://www.learncpp.com/' },
      { title: 'freeCodeCamp C++', url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y' },
    ],
    qa: {
      'what is a pointer': 'A variable that stores the memory address of another variable. Declared with `*`, addressed with `&`.',
      'what is raii': 'Resource Acquisition Is Initialization — resources are tied to object lifetime, automatically released in destructors.',
    },
    roadmap: '1. Syntax & basics → 2. Pointers & memory → 3. OOP → 4. Templates & STL → 5. Smart pointers → 6. Multithreading → 7. Systems projects',
  },
  go: {
    description: 'Go (Golang) is a fast, simple language by Google for cloud services, CLI tools, and concurrent systems.',
    concepts: ['goroutines', 'channels', 'interfaces', 'structs', 'defer', 'slices', 'packages'],
    resources: [
      { title: 'Go Tour', url: 'https://go.dev/tour/' },
      { title: 'Go by Example', url: 'https://gobyexample.com/' },
      { title: 'freeCodeCamp Go', url: 'https://www.youtube.com/watch?v=un6ZyFkqFKo' },
    ],
    roadmap: '1. Syntax → 2. Functions & structs → 3. Interfaces → 4. Goroutines & channels → 5. Packages & modules → 6. Web servers → 7. Cloud projects',
  },
  rust: {
    description: 'Rust is a systems language focused on safety and performance, with no garbage collector and memory safety guarantees.',
    concepts: ['ownership', 'borrowing', 'lifetimes', 'traits', 'enums', 'pattern matching', 'cargo'],
    resources: [
      { title: 'The Rust Book', url: 'https://doc.rust-lang.org/book/' },
      { title: 'Rust by Example', url: 'https://doc.rust-lang.org/rust-by-example/' },
      { title: 'freeCodeCamp Rust', url: 'https://www.youtube.com/watch?v=BpPEoZW5IiY' },
    ],
    roadmap: '1. Syntax & ownership → 2. Borrowing & lifetimes → 3. Structs & enums → 4. Traits → 5. Error handling → 6. Concurrency → 7. CLI/web projects',
  },
  typescript: {
    description: 'TypeScript adds static typing to JavaScript, catching errors early and improving code quality for large projects.',
    concepts: ['type annotations', 'interfaces', 'generics', 'union types', 'type guards', 'enums', 'decorators'],
    resources: [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' },
      { title: 'Total TypeScript', url: 'https://www.totaltypescript.com/' },
    ],
    roadmap: '1. Basic types → 2. Interfaces & type aliases → 3. Generics → 4. Utility types → 5. Advanced patterns → 6. React + TS → 7. Full-stack TS',
  },
  sql: {
    description: 'SQL is the standard language for managing relational databases — querying, inserting, updating, and deleting data.',
    concepts: ['SELECT', 'JOIN', 'GROUP BY', 'subqueries', 'indexes', 'transactions', 'normalization'],
    resources: [
      { title: 'SQLBolt', url: 'https://sqlbolt.com/' },
      { title: 'Mode SQL Tutorial', url: 'https://mode.com/sql-tutorial/' },
      { title: 'freeCodeCamp SQL', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
    ],
    roadmap: '1. SELECT basics → 2. WHERE & filtering → 3. JOINs → 4. Aggregations (GROUP BY) → 5. Subqueries → 6. Indexing → 7. Database design',
  },
  react: {
    description: 'React is a JavaScript library for building component-based UIs with a virtual DOM for efficient rendering.',
    concepts: ['components', 'props', 'state', 'hooks', 'useEffect', 'context', 'React Router'],
    resources: [
      { title: 'React Official Docs', url: 'https://react.dev/' },
      { title: 'freeCodeCamp React', url: 'https://www.freecodecamp.org/learn/front-end-development-libraries/' },
    ],
    roadmap: '1. JSX & components → 2. Props & state → 3. Hooks (useState, useEffect) → 4. Context & routing → 5. State management → 6. Testing → 7. Full apps',
  },
  'machine-learning': {
    description: 'Machine Learning enables computers to learn patterns from data without explicit programming.',
    concepts: ['supervised learning', 'unsupervised learning', 'neural networks', 'overfitting', 'feature engineering'],
    resources: [
      { title: 'fast.ai', url: 'https://www.fast.ai/' },
      { title: 'Andrew Ng Coursera', url: 'https://www.coursera.org/learn/machine-learning' },
      { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn' },
    ],
    roadmap: '1. Math basics (linear algebra, stats) → 2. Python + NumPy/Pandas → 3. Scikit-learn → 4. Neural networks → 5. Deep learning (PyTorch/TF) → 6. Projects',
  },
};

const TOPIC_ALIASES = {
  'c++': 'cpp', 'c plus plus': 'cpp', cplusplus: 'cpp',
  golang: 'go', 'go lang': 'go',
  ts: 'typescript', 'type script': 'typescript',
  js: 'javascript', 'java script': 'javascript',
  py: 'python',
  ml: 'machine-learning', 'machine learning': 'machine-learning', 'deep learning': 'machine-learning',
  'data science': 'machine-learning',
  reactjs: 'react', 'react.js': 'react', 'react js': 'react',
  kotlin: 'java', swift: 'java',
  mysql: 'sql', postgres: 'sql', postgresql: 'sql', sqlite: 'sql',
};

function detectTopic(text) {
  const lower = text.toLowerCase();
  for (const [alias, topic] of Object.entries(TOPIC_ALIASES)) {
    if (lower.includes(alias)) return topic;
  }
  for (const topic of Object.keys(KNOWLEDGE_BASE)) {
    if (lower.includes(topic)) return topic;
  }
  return null;
}

function generateResponse(message, user) {
  const text = message.toLowerCase().trim();
  const topic = detectTopic(text);

  // Greeting
  if (/^(hi|hello|hey|sup|yo)\b/.test(text)) {
    return { text: `Hey ${user?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your learning coach. Ask me about any programming language, request a study roadmap, or ask for resource recommendations. What would you like to learn?`, suggestions: ['Python roadmap', 'What is JavaScript?', 'Resources for Java'] };
  }

  // Help
  if (text === 'help' || text.includes('what can you')) {
    return { text: 'I can help with:\n• **Language info** — "What is Rust?"\n• **Roadmaps** — "Python roadmap"\n• **Concepts** — "What is a closure?"\n• **Resources** — "Resources for Go"\n• **Certificates** — "How do certificates work?"\n• **Platform help** — streaks, premium, recommendations', suggestions: ['Python roadmap', 'Resources for React', 'How do streaks work?'] };
  }

  // Certificates
  if (text.includes('certificate')) {
    return { text: 'When you complete a course and click **"Mark lesson complete"**, a professional certificate is generated that you can download as a PNG. Visit **My Certificates** in the sidebar to see all your earned certificates!', suggestions: ['How do streaks work?', 'What should I study?'] };
  }

  // Streaks & badges
  if (text.includes('streak') || text.includes('badge')) {
    return { text: 'Your streak grows when you have learning activity on consecutive days. Badge milestones are at **7, 30, 100, 365, and 500 days**. Check your Profile page to see your current streak and badges!', suggestions: ['How do certificates work?', 'What should I study?'] };
  }

  // Premium
  if (text.includes('premium') || text.includes('locked') || text.includes('unlock')) {
    return { text: 'Premium mode unlocks advanced and project-based courses. Use the **Free/Premium** toggle in the sidebar. Premium courses show a 🔒 icon for free users.', suggestions: ['What should I study?', 'Python roadmap'] };
  }

  // Roadmap request
  if (topic && (text.includes('roadmap') || text.includes('path') || text.includes('how to learn') || text.includes('where to start') || text.includes('getting started'))) {
    const kb = KNOWLEDGE_BASE[topic];
    return { text: `📍 **${topic.charAt(0).toUpperCase() + topic.slice(1)} Learning Roadmap:**\n\n${kb.roadmap}\n\n**Key concepts to master:** ${kb.concepts.slice(0, 5).join(', ')}`, suggestions: [`Resources for ${topic}`, `What is ${topic}?`, 'Another language?'] };
  }

  // Resources request
  if (topic && (text.includes('resource') || text.includes('tutorial') || text.includes('course') || text.includes('learn') || text.includes('where') || text.includes('recommend'))) {
    const kb = KNOWLEDGE_BASE[topic];
    const links = kb.resources.map((r) => `• [${r.title}](${r.url})`).join('\n');
    return { text: `📚 **Top resources for ${topic}:**\n\n${links}\n\n${kb.description}`, suggestions: [`${topic} roadmap`, `Explain ${kb.concepts[0]}`, 'Resources for another language'] };
  }

  // What is [topic]
  if (topic && (text.includes('what is') || text.includes('what\'s') || text.includes('tell me about') || text.includes('explain') || text.startsWith('about '))) {
    const kb = KNOWLEDGE_BASE[topic];
    // Check specific QA
    for (const [q, a] of Object.entries(kb.qa || {})) {
      if (text.includes(q)) return { text: a, suggestions: [`${topic} roadmap`, `Resources for ${topic}`] };
    }
    return { text: `**${topic.charAt(0).toUpperCase() + topic.slice(1)}**: ${kb.description}\n\n**Key concepts:** ${kb.concepts.join(', ')}`, suggestions: [`${topic} roadmap`, `Resources for ${topic}`, `${kb.concepts[0]} explained`] };
  }

  // Topic-specific Q&A lookup
  if (topic) {
    const kb = KNOWLEDGE_BASE[topic];
    for (const [q, a] of Object.entries(kb.qa || {})) {
      if (text.includes(q) || q.split(' ').filter((w) => w.length > 3).every((w) => text.includes(w))) {
        return { text: a, suggestions: [`${topic} roadmap`, `Resources for ${topic}`] };
      }
    }
    // Fallback for topic mention
    return { text: `For **${topic}**, I recommend starting with the roadmap. ${kb.description}`, suggestions: [`${topic} roadmap`, `Resources for ${topic}`, `What is ${topic}?`] };
  }

  // Study recommendation
  if (text.includes('study') || text.includes('next') || text.includes('suggest') || text.includes('recommend')) {
    const topics = user?.preferred_topics || ['python'];
    const t = topics[0] || 'python';
    const goals = user?.learning_goals || [];
    return { text: `Based on your profile, I'd suggest focusing on **${t}**. ${goals.length > 0 ? `Your goals: ${goals.slice(0, 2).join(', ')}.` : ''}\n\nStart with a course from the dashboard, complete it, and earn your certificate! 🎓`, suggestions: [`${t} roadmap`, `Resources for ${t}`, 'How do certificates work?'] };
  }

  // Concept questions without topic
  if (text.includes('what is') || text.includes('explain') || text.includes('how does') || text.includes('how do')) {
    // Search all QA
    for (const [, kb] of Object.entries(KNOWLEDGE_BASE)) {
      for (const [q, a] of Object.entries(kb.qa || {})) {
        if (text.includes(q) || q.split(' ').filter((w) => w.length > 3).every((w) => text.includes(w))) {
          return { text: a, suggestions: ['Ask another question', 'Show me resources'] };
        }
      }
    }
  }

  // Default
  return { text: 'I can help with programming languages (Python, Java, C++, Go, Rust, TypeScript, SQL, and more), study roadmaps, resources, certificates, and platform features. Try asking something like **"Python roadmap"** or **"Resources for React"**!', suggestions: ['Python roadmap', 'What is JavaScript?', 'How do certificates work?'] };
}

function formatMessage(text) {
  // Simple markdown: **bold**, `code`, and [links](url)
  let formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-xs text-accent-200">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-accent-300 underline hover:text-accent-200">$1</a>')
    .replace(/\n/g, '<br/>');
  return formatted;
}

function LearningChatbot() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your AI learning coach. Ask me about any programming language, request study roadmaps, or get resource recommendations. What would you like to learn today?`,
      suggestions: ['What should I study?', 'Python roadmap', 'How do certificates work?'],
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const sendMessage = (message = input) => {
    const clean = message.trim();
    if (!clean || typing) return;

    setMessages((prev) => [...prev, { role: 'user', content: clean }]);
    setInput('');
    setTyping(true);

    // Simulated thinking delay
    const delay = 300 + Math.random() * 500;
    setTimeout(() => {
      const response = generateResponse(clean, user);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.text, suggestions: response.suggestions }]);
      setTyping(false);
    }, delay);
  };

  const latestSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].suggestions) return messages[i].suggestions;
    }
    return ['What should I study?', 'Python roadmap', 'Resources for React'];
  }, [messages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-300/30 bg-accent-300 text-slate-950 shadow-2xl shadow-cyan-950/40 transition-transform hover:-translate-y-1"
        aria-label="Open learning chatbot"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.82L3 20l1.28-3.2A7.53 7.53 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="glass-card fixed bottom-24 right-5 z-[70] flex h-[36rem] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-2xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">🤖 Learning Coach</p>
                  <p className="text-xs text-slate-500">Ask about any language, roadmaps, or resources</p>
                </div>
                <div className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'mr-4 border border-white/10 bg-white/[0.05] text-slate-200'
                      : 'ml-4 bg-accent-300 text-slate-950'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
              ))}

              {typing && (
                <div className="mr-4 flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-accent-300/60"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="space-y-3 border-t border-white/10 p-3">
              <div className="flex flex-wrap gap-1.5">
                {latestSuggestions.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={typing}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="input-field py-2 text-sm"
                  placeholder="Ask about Python, Java, C++..."
                  disabled={typing}
                />
                <button type="submit" disabled={typing} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LearningChatbot;
