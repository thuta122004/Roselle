import React, { useState } from 'react';
import { Database, KeyRound, Lock, Mail, User, X } from 'lucide-react';

interface AuthAndSetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isSupabaseConfigured: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
}

export const AuthAndSetupModal: React.FC<AuthAndSetupModalProps> = ({
  isOpen,
  onClose,
  isSupabaseConfigured,
  onSignIn,
  onSignUp,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(
        'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable live Supabase authentication.',
      );
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === 'signin'
          ? await onSignIn(email, password)
          : await onSignUp(email, password, fullName);
      if (res.error) {
        setError(res.error);
      } else if (onClose) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D2226]/35 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="soft-card w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#FCE7EC] text-[#E87A90] inline-flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 id="auth-modal-title" className="text-lg font-semibold text-[#2D2226]">
                {isSupabaseConfigured ? 'Sign In to Roselle' : 'Supabase Connection'}
              </h2>
              <p className="text-xs text-[#7A656C] mt-0.5">
                {isSupabaseConfigured
                  ? 'Access your personal and household ledger.'
                  : 'Currently running in Interactive Local Demo Mode.'}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close authentication modal"
              className="p-2 rounded-xl text-[#7A656C] hover:text-[#2D2226] hover:bg-[#FCE7EC] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isSupabaseConfigured && (
          <div className="mt-4 rounded-xl border border-[#F9E4EA] bg-[#FFF9FA] p-4 space-y-2 text-xs text-[#7A656C]">
            <p className="font-semibold text-[#2D2226] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#E87A90]" />
              <span>Connect Your Supabase Project</span>
            </p>
            <ol className="list-decimal list-inside space-y-1 leading-relaxed">
              <li>
                Add <code className="font-mono-num text-[#2D2226]">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono-num text-[#2D2226]">VITE_SUPABASE_ANON_KEY</code> in
                Secrets or <code className="font-mono-num text-[#2D2226]">.env</code>.
              </li>
              <li>
                Run the PostgreSQL schema and Row Level Security policies from{' '}
                <code className="font-mono-num text-[#2D2226]">SUPABASE_SETUP.md</code> in the
                Supabase SQL Editor.
              </li>
              <li>Restart the app to switch seamlessly from Demo Mode to live Postgres sync.</li>
            </ol>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#FFF9FA] border border-[#F9E4EA]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'signin' ? 'bg-[#FCE7EC] text-[#2D2226]' : 'text-[#7A656C]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'signup' ? 'bg-[#FCE7EC] text-[#2D2226]' : 'text-[#7A656C]'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#7A656C] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A656C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Clara Vance"
                  className="input-field !pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#7A656C] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7A656C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clara@vancehome.org"
                className="input-field !pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#7A656C] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7A656C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="input-field !pl-10"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#D9536F] bg-[#FDECEF] px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#E87A90] hover:bg-[#D6657C] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading
              ? 'Connecting...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
