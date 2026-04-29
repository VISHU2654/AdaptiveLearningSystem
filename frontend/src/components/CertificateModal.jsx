import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

function generateCertId(userName, courseTitle, date) {
  return `ALS-${hashCode(`${userName}-${courseTitle}-${date}`)}-${date.replace(/-/g, '')}`;
}

function saveCertificate(cert) {
  const stored = JSON.parse(localStorage.getItem('certificates') || '[]');
  const exists = stored.some((c) => c.certId === cert.certId);
  if (!exists) {
    stored.push(cert);
    localStorage.setItem('certificates', JSON.stringify(stored));
  }
}

function drawCertificate(canvas, { userName, courseTitle, completionDate, certId }) {
  const ctx = canvas.getContext('2d');
  const W = 1200;
  const H = 850;
  canvas.width = W;
  canvas.height = H;

  // --- Background ---
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0a0f1e');
  bgGrad.addColorStop(0.5, '#111827');
  bgGrad.addColorStop(1, '#0d1f1b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // --- Decorative border ---
  const borderGrad = ctx.createLinearGradient(0, 0, W, H);
  borderGrad.addColorStop(0, '#7c3aed');
  borderGrad.addColorStop(0.5, '#0891b2');
  borderGrad.addColorStop(1, '#059669');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // --- Inner subtle border ---
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(42, 42, W - 84, H - 84);

  // --- Corner accents ---
  const cornerSize = 40;
  const corners = [
    [30, 30, 1, 1],
    [W - 30, 30, -1, 1],
    [30, H - 30, 1, -1],
    [W - 30, H - 30, -1, -1],
  ];
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * cornerSize, y);
    ctx.stroke();
  });

  // --- Subtle radial glow ---
  const glow = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, 400);
  glow.addColorStop(0, 'rgba(8, 145, 178, 0.08)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // --- Trophy / Award icon ---
  ctx.save();
  ctx.translate(W / 2, 130);
  const iconGrad = ctx.createLinearGradient(-25, -25, 25, 25);
  iconGrad.addColorStop(0, '#7c3aed');
  iconGrad.addColorStop(1, '#0891b2');
  ctx.fillStyle = iconGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  // Checkmark inside
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-4, 10);
  ctx.lineTo(14, -10);
  ctx.stroke();
  ctx.restore();

  // --- "CERTIFICATE OF COMPLETION" ---
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('C E R T I F I C A T E   O F   C O M P L E T I O N', W / 2, 200);

  // --- Divider line ---
  const divGrad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  divGrad.addColorStop(0, 'transparent');
  divGrad.addColorStop(0.5, 'rgba(8, 145, 178, 0.5)');
  divGrad.addColorStop(1, 'transparent');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.25, 220);
  ctx.lineTo(W * 0.75, 220);
  ctx.stroke();

  // --- "This is to certify that" ---
  ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
  ctx.font = '400 16px Inter, system-ui, sans-serif';
  ctx.fillText('This is to certify that', W / 2, 270);

  // --- User name ---
  const nameGrad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0);
  nameGrad.addColorStop(0, '#7c3aed');
  nameGrad.addColorStop(0.5, '#0891b2');
  nameGrad.addColorStop(1, '#059669');
  ctx.fillStyle = nameGrad;
  ctx.font = 'bold 42px Inter, system-ui, sans-serif';
  ctx.fillText(userName, W / 2, 330);

  // --- Underline below name ---
  ctx.strokeStyle = divGrad;
  ctx.beginPath();
  ctx.moveTo(W * 0.3, 348);
  ctx.lineTo(W * 0.7, 348);
  ctx.stroke();

  // --- "has successfully completed" ---
  ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
  ctx.font = '400 16px Inter, system-ui, sans-serif';
  ctx.fillText('has successfully completed the course', W / 2, 395);

  // --- Course title ---
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  // Wrap long titles
  const maxTitleWidth = W - 200;
  if (ctx.measureText(courseTitle).width > maxTitleWidth) {
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  }
  ctx.fillText(courseTitle, W / 2, 445, maxTitleWidth);

  // --- "on the AdaptLearn platform" ---
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.font = '400 14px Inter, system-ui, sans-serif';
  ctx.fillText('on the AdaptLearn Adaptive Learning Platform', W / 2, 490);

  // --- Date section ---
  ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
  ctx.font = '400 14px Inter, system-ui, sans-serif';
  ctx.fillText('Date of Completion', W * 0.28, 580);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 18px Inter, system-ui, sans-serif';
  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ctx.fillText(formattedDate, W * 0.28, 608);

  // --- Certificate ID section ---
  ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
  ctx.font = '400 14px Inter, system-ui, sans-serif';
  ctx.fillText('Certificate ID', W * 0.72, 580);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 14px "Courier New", monospace';
  ctx.fillText(certId, W * 0.72, 608);

  // --- Bottom divider ---
  ctx.strokeStyle = divGrad;
  ctx.beginPath();
  ctx.moveTo(W * 0.15, 660);
  ctx.lineTo(W * 0.85, 660);
  ctx.stroke();

  // --- Issuer / Branding ---
  ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.font = '400 12px Inter, system-ui, sans-serif';
  ctx.fillText('Issued by', W / 2, 700);

  const brandGrad = ctx.createLinearGradient(W * 0.4, 0, W * 0.6, 0);
  brandGrad.addColorStop(0, '#7c3aed');
  brandGrad.addColorStop(1, '#0891b2');
  ctx.fillStyle = brandGrad;
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillText('AdaptLearn', W / 2, 730);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.font = '400 11px Inter, system-ui, sans-serif';
  ctx.fillText('Adaptive Learning Recommendation System', W / 2, 755);

  // --- Grid pattern overlay (very subtle) ---
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.03)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < W; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function CertificateModal({ course, userName, onClose }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const dateStr = new Date().toISOString().slice(0, 10);
  const certId = generateCertId(userName || 'Learner', course?.title || 'Course', dateStr);

  const certData = {
    userName: userName || 'Learner',
    courseTitle: course?.title || 'Course',
    completionDate: dateStr,
    certId,
  };

  useEffect(() => {
    if (!course) return;

    // Save to localStorage
    saveCertificate({
      courseId: course.id,
      courseTitle: course.title,
      userName: certData.userName,
      date: dateStr,
      certId,
      difficulty: course.difficulty,
      contentType: course.content_type,
    });

    // Draw certificate after a brief delay for animation
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        drawCertificate(canvasRef.current, certData);
        setReady(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [course]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `AdaptLearn-Certificate-${certData.courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }, [certData.courseTitle]);

  if (!course) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400">
                <svg className="h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Congratulations! 🎉</h2>
                <p className="text-sm text-slate-400">You earned a certificate of completion</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close certificate"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Certificate canvas */}
          <div className="flex-1 overflow-y-auto bg-slate-950/60 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: ready ? 1 : 0.3, scale: ready ? 1 : 0.95 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mx-auto w-full max-w-3xl"
            >
              <canvas
                ref={canvasRef}
                className="w-full rounded-xl shadow-2xl shadow-cyan-950/30"
                style={{ aspectRatio: '1200 / 850' }}
              />
              {!ready && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-3 w-3 animate-bounce rounded-full bg-accent-300"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/80 px-6 py-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Saved to your certificates
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!ready}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Certificate
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { drawCertificate, generateCertId };
export default CertificateModal;
