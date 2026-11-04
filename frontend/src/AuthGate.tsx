import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode
} from 'react';

import {
  Activity,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

import {
  api,
  clearToken,
  getToken,
  saveToken
} from './api';

type Props = {
  children: ReactNode;
};

export default function AuthGate({ children }: Props) {
  const [authenticated, setAuthenticated] = useState(Boolean(getToken()));
  const [checking, setChecking] = useState(true);
  const [registerMode, setRegisterMode] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (getToken()) {
        try {
          await api.get('/dashboard');

          if (active) {
            setAuthenticated(true);
          }
        } catch {
          clearToken();

          if (active) {
            setAuthenticated(false);
          }
        }
      }

      try {
        const response = await api.get('/auth/status');

        if (active) {
          setRegisterMode(!response.data.account_exists);
        }
      } catch {
        if (active) {
          setError(
            'Cannot connect to VetScholar backend. Start the backend and refresh.'
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    check();

    const onLogout = () => {
      clearToken();
      setAuthenticated(false);
    };

    window.addEventListener('vetscholar:logout', onLogout);

    return () => {
      active = false;
      window.removeEventListener('vetscholar:logout', onLogout);
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < 10) {
      setError('Password must contain at least 10 characters.');
      return;
    }

    if (registerMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        registerMode ? '/auth/register' : '/auth/login',
        {
          email,
          password
        }
      );

      saveToken(response.data.access_token);
      setAuthenticated(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setAuthenticated(false);
    setPassword('');
    setConfirmPassword('');
  };

  if (checking) {
    return (
      <div className="auth-loading">
        <Activity size={25} />
        <p>Loading VetScholar AI...</p>
      </div>
    );
  }

  if (authenticated) {
    return (
      <>
        <button className="auth-logout" onClick={logout}>
          Sign out
        </button>

        {children}
      </>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-logo">
            <Stethoscope size={27} />
          </div>

          <div>
            <h1>
              VetScholar <span>AI</span>
            </h1>
            <p>INDEPENDENT VETERINARY AI PROJECT</p>
          </div>
        </div>

        <div className="auth-heading">
          <div className="auth-icon">
            {registerMode ? (
              <ShieldCheck size={22} />
            ) : (
              <LockKeyhole size={22} />
            )}
          </div>

          <h2>
            {registerMode
              ? 'Create your workspace'
              : 'Welcome back'}
          </h2>

          <p>
            {registerMode
              ? 'Create the first administrator account to secure your research workspace.'
              : 'Sign in to access your veterinary research workspace.'}
          </p>
        </div>

        <form onSubmit={submit}>
          <label>Email address</label>

          <div className="auth-input">
            <Mail size={17} />

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </div>

          <label>Password</label>

          <div className="auth-input">
            <LockKeyhole size={17} />

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              autoComplete={
                registerMode
                  ? 'new-password'
                  : 'current-password'
              }
              minLength={10}
              required
            />
          </div>

          {registerMode && (
            <>
              <label>Confirm password</label>

              <div className="auth-input">
                <LockKeyhole size={17} />

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Enter password again"
                  autoComplete="new-password"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : registerMode
                ? 'Create secure account'
                : 'Sign in to VetScholar'}
          </button>
        </form>

        <div className="auth-security">
          <ShieldCheck size={16} />

          <span>
            Local account authentication. Passwords are stored as secure hashes.
          </span>
        </div>

        <div className="auth-footer">
          © 2026 VetScholar AI · Demo Workspace
        </div>

      </div>
    </div>
  );
}