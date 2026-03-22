import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ApolloProvider } from '@apollo/client';
import { Box } from '@mui/material';

import { apolloClient }    from './lib/apollo';
import { AuthProvider }    from './context/AuthContext';
import ErrorBoundary       from './components/ErrorBoundary';
import ProtectedRoute      from './components/ProtectedRoute';
import Sidebar             from './components/Sidebar';
import Login               from './pages/Login';
import Dashboard           from './pages/Dashboard';
import MeetingDetail       from './pages/MeetingDetail';
import AdminUsers          from './pages/admin/AdminUsers';
import AdminMeetings       from './pages/admin/AdminMeetings';
import AdminStats          from './pages/admin/AdminStats';

// ─── MUI Theme ────────────────────────────────────────────────────────────────

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#4f6ef7' },
    secondary:  { main: '#22c55e' },
    background: { default: '#0d0f14', paper: '#13161e' },
    text:       { primary: '#f0f2f8', secondary: '#9aa3bc' },
    divider:    'rgba(255,255,255,0.07)',
  },
  typography: { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.07)' },
      },
    },
    MuiChip: { styleOverrides: { root: { fontSize: 11 } } },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#13161e' },
      },
    },
  },
});

// ─── App Layout (with sidebar) ────────────────────────────────────────────────

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, sm: 4 },
          overflow: 'auto',
          maxWidth: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — any authenticated user */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ErrorBoundary label="Dashboard"><Dashboard /></ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/meetings/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ErrorBoundary label="Meeting Detail"><MeetingDetail /></ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* Protected — admin only */}
              <Route path="/admin/meetings" element={
                <ProtectedRoute adminOnly>
                  <AppLayout>
                    <ErrorBoundary label="All Meetings"><AdminMeetings /></ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute adminOnly>
                  <AppLayout>
                    <ErrorBoundary label="Users"><AdminUsers /></ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/admin/stats" element={
                <ProtectedRoute adminOnly>
                  <AppLayout>
                    <ErrorBoundary label="Stats"><AdminStats /></ErrorBoundary>
                  </AppLayout>
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;
