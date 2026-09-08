import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, RotateCw, CheckCircle2, Lock } from 'lucide-react';

const generateCaptchaCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const SecurityCaptcha = ({ onVerify, error, resetKey }) => {
  const [captchaCode, setCaptchaCode] = useState(generateCaptchaCode);
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [localError, setLocalError] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    refreshCaptcha();
  }, [resetKey]);

  useEffect(() => {
    drawCaptcha();
  }, [captchaCode]);

  const drawCaptcha = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#f1f5f9');
    grad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(0, 87, 187, ${0.15 + Math.random() * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.bezierCurveTo(
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height,
        Math.random() * canvas.width, Math.random() * canvas.height
      );
      ctx.stroke();
    }

    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = `rgba(15, 23, 42, ${0.1 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const letters = captchaCode.split('');
    const startX = 18;
    const spacing = 26;

    letters.forEach((char, idx) => {
      ctx.save();
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.fillStyle = idx % 2 === 0 ? '#0057BB' : '#0f172a';
      const x = startX + idx * spacing;
      const y = 28 + (Math.random() * 4 - 2);
      const angle = (Math.random() * 20 - 10) * (Math.PI / 180);
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  };

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptchaCode());
    setUserInput('');
    setIsVerified(false);
    setLocalError('');
    if (onVerify) onVerify(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    setUserInput(val);
    setLocalError('');

    if (val === captchaCode) {
      setIsVerified(true);
      if (onVerify) onVerify(true);
    } else {
      setIsVerified(false);
      if (onVerify) onVerify(false);
      if (val.length === 4) {
        setLocalError('Code does not match. Try again.');
      }
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <ShieldCheck size={16} className="text-[#0057BB]" />
          <span>Security Verification</span>
        </div>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 size={13} />
            Verified
          </span>
        )}
      </div>

      {isVerified ? (
        <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Human verification passed</span>
          </div>
          <button
            type="button"
            onClick={refreshCaptcha}
            className="text-[11px] text-emerald-700 hover:underline font-bold"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg overflow-hidden border border-slate-300 shadow-inner bg-white shrink-0">
              <canvas
                ref={canvasRef}
                width={130}
                height={40}
                className="block select-none pointer-events-none"
                aria-label="Captcha Image"
              />
            </div>

            <button
              type="button"
              onClick={refreshCaptcha}
              title="Get new code"
              className="p-2 text-slate-500 hover:text-[#0057BB] hover:bg-slate-200/60 rounded-lg transition-colors shrink-0"
            >
              <RotateCw size={15} />
            </button>

            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              maxLength={4}
              value={userInput}
              onChange={handleInputChange}
              placeholder="Code"
              className="flex-1 min-w-0 h-10 px-3 text-center uppercase tracking-widest font-mono font-bold text-base bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0057BB] focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-xs"
            />
          </div>

          {(localError || error) && (
            <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
              <Lock size={12} className="shrink-0" />
              <span>{localError || error}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SecurityCaptcha;
