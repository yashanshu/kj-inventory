import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/auth';
import { Package, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await authService.login({ userId, password });
      setUser(response.user);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--neutral-50)',
    }}>
      {/* Left — brand panel (hidden on mobile) */}
      <div
        className="hidden lg:flex"
        style={{
          width: 440, flexShrink: 0,
          background: 'var(--sidebar-bg)',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3rem',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(99 102 241 / 0.25) 0%, transparent 70%)',
          top: -80, right: -80, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 250, height: 250, borderRadius: '50%',
          background: 'radial-gradient(circle, rgb(139 92 246 / 0.2) 0%, transparent 70%)',
          bottom: 60, left: -60, pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgb(99 102 241 / 0.4)',
          }}>
            <Package style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>KJ Inventory</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Restaurant Ops Platform</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em',
            color: '#f1f5f9', marginBottom: '1rem',
          }}>
            Smarter inventory.<br />
            <span style={{ color: '#818cf8' }}>Fewer stockouts.</span>
          </h2>
          <p style={{ fontSize: '0.9375rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 320 }}>
            Track stock levels, manage orders from Swiggy & Zomato, and keep your kitchen running at full speed.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {['Real-time stock tracking', 'Swiggy & Zomato order sync', 'Low-stock alerts & notifications'].map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'rgb(99 102 241 / 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8' }} />
              </div>
              <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.875rem',
            }}>
              <Package style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
              KJ Inventory
            </h1>
          </div>

          {/* Form header */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--neutral-900)', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--neutral-500)' }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-ring)',
              color: 'var(--status-danger-text)',
              fontSize: '0.875rem', marginBottom: '1.25rem',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {/* User ID */}
            <div>
              <label className="form-label">User ID</label>
              <div className="input-icon-wrap">
                <User className="input-icon" style={{ width: 15, height: 15 }} />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="form-input"
                  placeholder="e.g. admin"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" style={{ width: 15, height: 15 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--neutral-400)', display: 'flex', padding: 2,
                  }}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 15, height: 15 }} />
                    : <Eye style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%', justifyContent: 'center',
                marginTop: '0.25rem',
                background: isSubmitting ? 'var(--brand-500)' : undefined,
              }}
            >
              {isSubmitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: 14, height: 14, border: '2px solid rgb(255 255 255 / 0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--neutral-500)' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ fontWeight: 600, color: 'var(--brand-600)', textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
