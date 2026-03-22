import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
  /** Optional label shown in the error panel so users know where the crash occurred. */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches unhandled render errors in its subtree and shows a friendly
 * fallback instead of a blank screen.
 *
 * Usage:
 *   <ErrorBoundary label="Dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you could send this to a monitoring service (Sentry etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const area = this.props.label ? ` in ${this.props.label}` : '';

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          p: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            maxWidth: 480,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'error.dark',
            borderRadius: 3,
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Something went wrong{area}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {this.state.message || 'An unexpected error occurred. Please try again.'}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={this.handleReset}
            sx={{ mr: 1.5 }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.assign('/')}
          >
            Go to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }
}
