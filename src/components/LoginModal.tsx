import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, X, AlertCircle } from "lucide-react";

interface LoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        onLoginSuccess();
        return;
      }

      setError(data.error || "Invalid administrative credentials.");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-modal-overlay" className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative max-h-[92dvh] w-full max-w-xs sm:max-w-sm overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 sm:right-4 top-3 sm:top-4 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all"
          title="Back to Support Chat"
          id="close-login-btn"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        <div className="bg-slate-950 border-b border-slate-800/60 px-4 sm:px-5 py-5 sm:py-7 text-center sm:p-6 sm:pb-8 sm:pt-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-3 shadow-lg shadow-blue-500/20 text-white">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h2 className="font-bold text-slate-100 text-base sm:text-lg tracking-tight">PugArch Admin Hub</h2>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-1">Authorized Support Staff Only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 p-4 sm:p-5 sm:p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-2.5 sm:p-3 rounded-xl flex items-start gap-2 sm:gap-2.5 text-[10px] sm:text-xs text-red-400"
            >
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-1">
            <label className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Staff Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 sm:left-3.5 top-2.5 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <input
                type="text"
                required
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-[11px] sm:text-xs pl-9 sm:pl-10 pr-2.5 sm:pr-3 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Security Password</label>
            <div className="relative">
              <Lock className="absolute left-3 sm:left-3.5 top-2.5 sm:top-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-[11px] sm:text-xs pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 sm:right-3 top-2.5 sm:top-3 text-slate-500 hover:text-slate-300"
                id="toggle-password-visibility-btn"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 sm:py-3 rounded-xl text-[11px] sm:text-xs shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 sm:gap-2 mt-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            Verify & Authenticate
          </button>
        </form>
      </motion.div>
    </div>
  );
}
