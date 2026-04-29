import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useAuthStore from '../store/authStore';

function createReply(message, user) {
  const text = message.toLowerCase();
  const topics = user?.preferred_topics || [];
  const goals = user?.learning_goals || [];

  if (text.includes('streak') || text.includes('badge')) {
    return 'Your streak grows when you complete learning activity on consecutive days. The big milestones shown in Profile are 100, 365, and 500 days.';
  }

  if (text.includes('premium') || text.includes('locked')) {
    return 'Premium mode unlocks advanced and project-based courses in this demo. Use the Free/Premium switch in the sidebar to preview both experiences.';
  }

  if (text.includes('recommend') || text.includes('course')) {
    const topic = topics[0] || 'python';
    return `Start with a ${topic} course, then complete one lesson to improve your recommendation signal. Your current goals are: ${goals.slice(0, 2).join(', ') || 'build a stronger learning profile'}.`;
  }

  if (text.includes('python')) {
    return 'For Python, focus on variables, control flow, functions, and one small project. The embedded freeCodeCamp course is a good guided start.';
  }

  if (text.includes('react') || text.includes('javascript')) {
    return 'For React, build components first, then practice state and effects. Save notes inside the course player while watching.';
  }

  if (text.includes('machine') || text.includes('ml')) {
    return 'For ML, learn data preparation, model evaluation, and ranking metrics. Premium demo lessons are marked with a lock for free users.';
  }

  return 'I can help with course choices, streaks, profile goals, premium locks, and learning strategy. Try asking what to study next.';
}

function LearningChatbot() {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi, I am your learning coach. Ask me what to study next, how streaks work, or why a course is locked.',
    },
  ]);

  const quickPrompts = useMemo(
    () => ['What should I study next?', 'How do streak badges work?', 'Why is this course locked?'],
    []
  );

  const sendMessage = (message = input) => {
    const clean = message.trim();
    if (!clean) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: clean },
      { role: 'assistant', content: createReply(clean, user) },
    ]);
    setInput('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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
            className="glass-card fixed bottom-24 right-5 z-[70] flex h-[32rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Learning coach</p>
              <p className="text-xs text-slate-500">Local demo assistant, no API key needed</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    message.role === 'assistant'
                      ? 'mr-6 border border-white/10 bg-white/[0.05] text-slate-200'
                      : 'ml-6 bg-accent-300 text-slate-950'
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-white/10 p-3">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/[0.08]"
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
                  placeholder="Ask a question..."
                />
                <button type="submit" className="btn-primary px-4 py-2 text-sm">
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
