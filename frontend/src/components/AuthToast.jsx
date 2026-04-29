import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function AuthToast({ message, type = 'error' }) {
  const isError = type === 'error';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.96 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className={`fixed right-4 top-4 z-[80] w-[min(92vw,24rem)] rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
            isError
              ? 'border-rose-400/30 bg-rose-950/70 text-rose-100 shadow-rose-950/40'
              : 'border-emerald-400/30 bg-emerald-950/70 text-emerald-100 shadow-emerald-950/40'
          }`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                isError ? 'bg-rose-400/15 text-rose-200' : 'bg-emerald-400/15 text-emerald-200'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isError ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                )}
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">{isError ? 'Action needed' : 'Success'}</p>
              <p className="mt-0.5 text-sm text-white/75">{message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AuthToast;
