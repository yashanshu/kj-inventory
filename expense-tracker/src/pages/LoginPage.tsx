import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.token, {
        id: res.user.id,
        email: res.user.email,
        orgId: res.user.organizationId,
        role: res.user.role,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Hero — deep gradient backdrop, editorial left-aligned title */}
      <div className="login-page__hero">
        <div className="login-page__brand">Ledgr</div>
        <p className="login-page__tagline">Your books. Done right.</p>
      </div>

      {/* Form sheet — lowest surface card that slides up over hero */}
      <div className="login-page__form-sheet">
        <h2>Sign in</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input"
            />
          </div>
          {error && (
            <div className="login-form__error" role="alert">{error}</div>
          )}
          <button
            type="submit"
            className="btn btn--primary btn--full"
            style={{ marginTop: '8px', height: '52px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
