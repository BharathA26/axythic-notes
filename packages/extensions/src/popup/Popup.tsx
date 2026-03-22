import React, { useState, useEffect } from 'react';

/* ─── Types for chrome.runtime messages ──────────────────────────────────────── */

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface RecordingStatus {
  isRecording: boolean;
  meetingId: string | null;
  platform: string | null;
  segmentCount: number;
}

/* ─── Styles (inline — keeps the popup self-contained) ───────────────────────── */

const colors = {
  bg:       '#0d0f14',
  bg2:      '#13161e',
  bg3:      '#1a1d27',
  border:   'rgba(255,255,255,0.07)',
  text:     '#f0f2f8',
  text2:    '#9aa3bc',
  text3:    '#5f6985',
  accent:   '#4f6ef7',
  accent2:  '#6d8aff',
  green:    '#10b981',
  red:      '#ef4444',
};

const S = {
  popup: {
    width: 340,
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    background: colors.bg,
    color: colors.text,
    fontSize: 13,
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 16px 12px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg2,
  } as React.CSSProperties,
  logo: {
    width: 30, height: 30,
    borderRadius: 8,
    background: 'rgba(79,110,247,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16,
  } as React.CSSProperties,
  body: { padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 14 } as React.CSSProperties,
  card: {
    padding: 14,
    borderRadius: 12,
    background: colors.bg2,
    border: `1px solid ${colors.border}`,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.bg3,
    color: colors.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  btnPrimary: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    background: colors.accent,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  btnGoogle: {
    width: '100%',
    padding: '10px 0',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: colors.bg3,
    color: colors.text,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as React.CSSProperties,
  btnOutline: {
    width: '100%',
    padding: '8px 0',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.text2,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  divider: {
    display: 'flex', alignItems: 'center', gap: 10,
    color: colors.text3, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em',
  } as React.CSSProperties,
  dividerLine: { flex: 1, height: 1, background: colors.border } as React.CSSProperties,
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(79,110,247,0.2)',
    color: colors.accent2,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800,
    overflow: 'hidden',
  } as React.CSSProperties,
  error: {
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: colors.red,
    fontSize: 12,
  } as React.CSSProperties,
  statusDot: (on: boolean) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: on ? colors.green : colors.text3,
    boxShadow: on ? `0 0 8px ${colors.green}` : 'none',
  }) as React.CSSProperties,
};

/* ─── Component ──────────────────────────────────────────────────────────────── */

function Popup() {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authMode, setAuthMode]   = useState<'login' | 'none'>('none');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [status, setStatus]       = useState<RecordingStatus | null>(null);

  // ── Check auth state on mount ──────────────────────────────────────────────
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      if (res?.user) setUser(res.user);
      setLoading(false);
    });
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      if (res) setStatus({
        isRecording:  res.isRecording,
        meetingId:    res.meetingId,
        platform:     res.platform,
        segmentCount: res.segments?.length ?? 0,
      });
    });
  }, []);

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogle = () => {
    setError('');
    setBusy(true);
    chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }, (res) => {
      setBusy(false);
      if (res?.success && res.user) {
        setUser(res.user);
        setAuthMode('none');
      } else {
        setError(res?.error || 'Google sign-in failed.');
      }
    });
  };

  // ── Email / Password Sign-In ───────────────────────────────────────────────
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setBusy(true);
    chrome.runtime.sendMessage(
      { type: 'SIGN_IN_EMAIL', email, password },
      (res) => {
        setBusy(false);
        if (res?.success && res.user) {
          setUser(res.user);
          setAuthMode('none');
        } else {
          setError(friendlyError(res?.error || 'Sign-in failed.'));
        }
      }
    );
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
      setUser(null);
    });
  };

  // ── Open frontend dashboard ────────────────────────────────────────────────
  const openDashboard = () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.popup, padding: 40, textAlign: 'center' }}>
        <div style={{ color: colors.text3, fontSize: 12 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={S.popup}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logo}>🎙</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>Axythic Note</div>
          <div style={{ fontSize: 11, color: colors.text3 }}>AI Meeting Assistant</div>
        </div>
      </div>

      <div style={S.body}>
        {/* ── Signed Out ─────────────────────────────────────────────────── */}
        {!user && authMode === 'none' && (
          <>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sign in to save meetings</div>
              <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.5 }}>
                Sign in to automatically save transcripts,<br />
                AI summaries, and action items.
              </div>
            </div>

            <button style={S.btnGoogle} onClick={handleGoogle} disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {busy ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div style={S.divider}>
              <div style={S.dividerLine} />
              <span>or</span>
              <div style={S.dividerLine} />
            </div>

            <button style={S.btnOutline} onClick={() => setAuthMode('login')}>
              Sign in with Email
            </button>
          </>
        )}

        {/* ── Email Form ─────────────────────────────────────────────────── */}
        {!user && authMode === 'login' && (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Sign in with Email</div>

            {error && <div style={S.error}>{error}</div>}

            <input
              style={S.input}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
            <input
              style={S.input}
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button style={S.btnPrimary} type="submit" disabled={busy || !email || !password}>
              {busy ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              style={{ ...S.btnOutline, marginTop: -4 }}
              onClick={() => { setAuthMode('none'); setError(''); }}
            >
              Back
            </button>
          </form>
        )}

        {/* ── Signed In ──────────────────────────────────────────────────── */}
        {user && (
          <>
            {/* User card */}
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={S.avatar}>
                {user.photoURL ? (
                  <img src={user.photoURL} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  (user.displayName || user.email || '?')[0].toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{ fontSize: 11, color: colors.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
              <div style={S.statusDot(true)} title="Signed in" />
            </div>

            {/* Recording status */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={S.statusDot(!!status?.isRecording)} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: status?.isRecording ? colors.green : colors.text3 }}>
                  {status?.isRecording ? 'Recording' : 'Not recording'}
                </span>
              </div>
              {status?.isRecording && (
                <div style={{ fontSize: 12, color: colors.text2, lineHeight: 1.6 }}>
                  Platform: <strong>{status.platform || 'Unknown'}</strong><br />
                  Segments captured: <strong>{status.segmentCount}</strong>
                </div>
              )}
              {!status?.isRecording && (
                <div style={{ fontSize: 12, color: colors.text3, lineHeight: 1.5 }}>
                  Open a Google Meet call to start capturing transcripts automatically.
                </div>
              )}
            </div>

            {/* Open Dashboard button */}
            <button style={S.btnPrimary} onClick={openDashboard}>
              Open Dashboard
            </button>

            {/* Sign out */}
            <button style={S.btnOutline} onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function friendlyError(code: string): string {
  if (code.includes('user-not-found'))    return 'No account with that email.';
  if (code.includes('wrong-password'))    return 'Incorrect password.';
  if (code.includes('invalid-email'))     return 'Invalid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try later.';
  if (code.includes('invalid-credential')) return 'Invalid email or password.';
  return code;
}

export default Popup;
