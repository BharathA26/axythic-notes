import {
  Box, Typography, Grid, Paper, CircularProgress, Alert,
} from '@mui/material';
import MeetingRoomIcon  from '@mui/icons-material/MeetingRoom';
import PeopleIcon       from '@mui/icons-material/People';
import AssignmentIcon   from '@mui/icons-material/Assignment';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import { useQuery, gql } from '@apollo/client';

const STATS = gql`
  query DashboardStats {
    dashboardStats {
      totalMeetings
      totalUsers
      openActionItems
      completedActionItems
    }
  }
`;

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <Paper
    elevation={0}
    sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
      <Box>
        <Typography variant="h4" fontWeight={700}>{value.toLocaleString()}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

export default function AdminStats() {
  const { data, loading, error } = useQuery(STATS);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error.message}</Alert>;

  const stats = data?.dashboardStats;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Organisation Stats</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<MeetingRoomIcon fontSize="inherit" />} label="Total Meetings"        value={stats.totalMeetings}        color="#4f6ef7" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<PeopleIcon fontSize="inherit" />}      label="Total Users"           value={stats.totalUsers}           color="#22c55e" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AssignmentIcon fontSize="inherit" />}  label="Open Action Items"     value={stats.openActionItems}      color="#f59e0b" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<CheckCircleIcon fontSize="inherit" />} label="Completed Action Items" value={stats.completedActionItems} color="#10b981" />
        </Grid>
      </Grid>
    </Box>
  );
}
