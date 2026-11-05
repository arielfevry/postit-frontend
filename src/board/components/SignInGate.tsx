import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import type { User } from '../types';
import { saveSession } from '../user';

/**
 * Minimal sign-in shown when the board has no credential for this tab (the
 * board routes need the email + password on every request), so the board can
 * be tested on its own. Once the real login page calls saveSession() after
 * /api/login, this only appears when a session expires.
 */
export default function SignInGate({
  onSignedIn,
  message,
  initialEmail = '',
}: {
  onSignedIn: (user: User) => void;
  message?: string | null;
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } =
        mode === 'login' ? await api.login(email, password) : await api.register(name, email, password);
      saveSession(user, email, password);
      onSignedIn(user);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="pb-app pb-gate">
      <form className="pb-gate__paper" onSubmit={submit}>
        <span className="pb-tape" aria-hidden="true" />
        <h1 className="pb-gate__brand">POST IT!</h1>
        <p className="small text-body-secondary mb-3">
          {mode === 'login' ? 'Sign in to open your board.' : 'Create an account to start pinning.'}
        </p>
        {message && mode === 'login' && <div className="alert alert-warning py-2 small">{message}</div>}
        {mode === 'register' && (
          <div className="mb-2">
            <label className="form-label small mb-1" htmlFor="pb-name">Name</label>
            <input id="pb-name" className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="mb-2">
          <label className="form-label small mb-1" htmlFor="pb-email">Email</label>
          <input id="pb-email" type="email" className="form-control form-control-sm" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="mb-3">
          <label className="form-label small mb-1" htmlFor="pb-password">Password</label>
          <input
            id="pb-password"
            type="password"
            className="form-control form-control-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <button type="submit" className="btn btn-dark btn-sm w-100" disabled={busy}>
          {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          className="btn btn-link btn-sm w-100 mt-1 text-body-secondary"
          onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
        >
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
