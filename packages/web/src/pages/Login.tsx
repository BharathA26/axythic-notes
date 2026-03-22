import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box, Button, Typography, CircularProgress, Alert, Paper,
  TextField, Divider, InputAdornment, IconButton,
} from '@mui/material';
import GoogleIcon    from '@mui/icons-material/Google';
import Visibility    from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth }   from '../context/AuthContext';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, firebaseUser, loading: authLoading } = useAuth();

  // Already authenticated → go to dashboard
  if (!authLoading && firebaseUser) {
    return <Navigate to="/" replace />;
  }

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      setError(friendlyError(err.code));
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(friendlyError(err.code));
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 30% 40%, rgba(79,110,247,0.12) 0%, transparent 60%)',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 5 },
          maxWidth: 420,
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f6ef7, #22c55e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 2, fontSize: 26,
            }}
          >
            📝
          </Box>
          <Typography variant="h5" fontWeight={700}>Axythic Notes</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Sign in to your account
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Email / Password form */}
        <Box component="form" onSubmit={handleEmailSignIn} noValidate>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPwd(p => !p)} edge="end" size="small">
                    {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2.5 }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.4, fontWeight: 600, mb: 2 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">or</Typography>
        </Divider>

        {/* Google */}
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleGoogleSignIn}
          disabled={loading}
          startIcon={<GoogleIcon />}
          sx={{ py: 1.4, fontWeight: 600, borderColor: 'divider' }}
        >
          Continue with Google
        </Button>

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={3}>
          By signing in you agree to our terms of service.
        </Typography>
      </Paper>
    </Box>
  );
}

// Convert Firebase error codes to readable messages
function friendlyError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':            return 'Invalid email address.';
    case 'auth/user-not-found':           return 'No account found with this email.';
    case 'auth/wrong-password':           return 'Incorrect password.';
    case 'auth/invalid-credential':       return 'Incorrect email or password.';
    case 'auth/too-many-requests':        return 'Too many attempts. Please try again later.';
    case 'auth/api-key-not-valid':        return 'Firebase is not configured. Check your .env file.';
    case 'auth/popup-closed-by-user':     return 'Sign-in popup was closed. Please try again.';
    case 'auth/network-request-failed':   return 'Network error. Check your connection.';
    default:                              return 'Sign in failed. Please try again.';
  }
}
