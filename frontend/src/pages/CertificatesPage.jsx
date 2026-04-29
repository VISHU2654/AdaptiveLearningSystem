import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { drawCertificate, generateCertId } from '../components/CertificateModal';

function CertificatesPage() {
  const [certificates, setCertificates] = useState([]);
  const [previewCert, setPreviewCert] = useState(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('certificates') || '[]');
    setCertificates(stored);
  }, []);

  useEffect(() => {
    if (previewCert && previewCanvasRef.current) {
      drawCertificate(previewCanvasRef.current, {
        userName: previewCert.userName,
        courseTitle: previewCert.courseTitle,
        completionDate: previewCert.date,
        certId: previewCert.certId,
      });
    }
  }, [previewCert]);

  const handleDownload = useCallback((cert) => {
    const offscreen = document.createElement('canvas');
    drawCertificate(offscreen, {
      userName: cert.userName,
      courseTitle: cert.courseTitle,
      completionDate: cert.date,
      certId: cert.certId,
    });
    const link = document.createElement('a');
    link.download = `AdaptLearn-Certificate-${cert.courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  }, []);

  const difficultyColors = {
    beginner: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    intermediate: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    advanced: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-44 sm:px-6 lg:ml-72 lg:px-8 lg:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
        className="mb-10"
      >
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent-300/80">
            Achievements
          </p>
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
            My <span className="gradient-text">Certificates</span>
          </h1>
          <p className="text-sm text-slate-400 sm:text-base">
            Your earned certificates of completion from AdaptLearn courses.
          </p>
        </div>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total certificates', value: certificates.length, accent: 'from-emerald-400 to-accent-400' },
            {
              label: 'Beginner courses',
              value: certificates.filter((c) => c.difficulty === 'beginner').length,
              accent: 'from-emerald-400 to-teal-400',
            },
            {
              label: 'Intermediate',
              value: certificates.filter((c) => c.difficulty === 'intermediate').length,
              accent: 'from-amber-400 to-orange-400',
            },
            {
              label: 'Advanced',
              value: certificates.filter((c) => c.difficulty === 'advanced').length,
              accent: 'from-rose-400 to-pink-400',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.28, ease: 'easeOut' }}
              className="glass-card rounded-xl p-4 transition-colors duration-200 hover:border-accent-300/30"
            >
              <div className={`mb-3 h-1 w-10 rounded-full bg-gradient-to-r ${stat.accent}`} />
              <p className="text-xs text-slate-400">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {certificates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center rounded-2xl py-20 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
            <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">No certificates yet</h3>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Complete a course from the dashboard and mark it as finished to earn your first certificate.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.certId}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
              whileHover={{ y: -4, scale: 1.01 }}
              className="glass-card group overflow-hidden rounded-xl transition-colors duration-300 hover:border-accent-300/40 hover:shadow-[0_24px_70px_rgba(8,145,178,0.15)]"
            >
              {/* Gradient header */}
              <div className="bg-gradient-to-r from-violet-600 via-cyan-600 to-emerald-600 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/90">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <span className="text-sm font-semibold">Certificate</span>
                  </div>
                  {cert.difficulty && (
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold capitalize ${difficultyColors[cert.difficulty] || difficultyColors.beginner}`}
                    >
                      {cert.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="mb-1 line-clamp-2 text-base font-semibold text-white transition-colors duration-200 group-hover:text-accent-200">
                  {cert.courseTitle}
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                  Earned{' '}
                  {new Date(cert.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-xs text-slate-500">Certificate ID</p>
                  <p className="font-mono text-xs text-slate-300">{cert.certId}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewCert(cert)}
                    className="flex-1 rounded-lg border border-accent-400/25 bg-accent-400/10 py-2 text-sm font-semibold text-accent-100 transition-all hover:bg-accent-400 hover:text-slate-950"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(cert)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewCert && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setPreviewCert(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{previewCert.courseTitle}</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(previewCert)}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewCert(null)}
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <canvas
              ref={previewCanvasRef}
              className="w-full rounded-xl shadow-2xl"
              style={{ aspectRatio: '1200 / 850' }}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default CertificatesPage;
