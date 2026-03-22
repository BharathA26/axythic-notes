import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardActionArea, CardContent,
  Chip, Grid, CircularProgress, Alert, Avatar, Stack, Divider,
} from '@mui/material';
import MicIcon         from '@mui/icons-material/Mic';
import PeopleIcon      from '@mui/icons-material/People';
import AccessTimeIcon  from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useQuery, gql } from '@apollo/client';
import { useAuth } from '../context/AuthContext';

const MY_MEETINGS = gql`
  query MyMeetings($page: Int, $limit: Int) {
    myMeetings(page: $page, limit: $limit) {
      total
      meetings {
        id title date createdAt participants summary
        actionItems { id status }
      }
    }
  }
`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { data, loading, error } = useQuery(MY_MEETINGS, {
    variables: { page: 1, limit: 50 },
  });

  const meetings   = data?.myMeetings?.meetings ?? [];
  const pendingCount = (m: any) => m.actionItems.filter((a: any) => a.status === 'pending').length;

  return (
    <Box>
      {/* Greeting */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700}>
          Welcome back, {appUser?.displayName?.split(' ')[0]} 👋
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Here are your recent meetings and action items.
        </Typography>
      </Box>

      {/* Stats row */}
      {!loading && !error && meetings.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: 'My Meetings',       value: data?.myMeetings?.total ?? 0,                                                    icon: <MicIcon /> },
            { label: 'Open Action Items', value: meetings.reduce((acc: number, m: any) => acc + pendingCount(m), 0),              icon: <CheckCircleIcon /> },
            { label: 'Participants',      value: new Set(meetings.flatMap((m: any) => m.participants)).size,                       icon: <PeopleIcon /> },
          ].map(stat => (
            <Grid item xs={12} sm={4} key={stat.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(79,110,247,0.12)', color: 'primary.main', width: 40, height: 40 }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={700}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Typography variant="h6" fontWeight={600}>Recent Meetings</Typography>
        {!loading && !error && (
          <Typography variant="caption" color="text.secondary">
            {data?.myMeetings?.total ?? 0} meeting{data?.myMeetings?.total !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {error && <Alert severity="warning" sx={{ borderRadius: 2 }}>{error.message}</Alert>}

      {!loading && !error && meetings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <MicIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
          <Typography variant="body2">No meetings yet.</Typography>
          <Typography variant="caption">
            Start a recording in the Chrome extension — it will appear here automatically.
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {meetings.map((meeting: any) => (
          <Grid item xs={12} sm={6} md={4} key={meeting.id}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', p: 0 }}
              >
                <CardContent sx={{ width: '100%', flexGrow: 1 }}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    gutterBottom
                    sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {meeting.title}
                  </Typography>

                  <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 1.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(meeting.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </Typography>
                  </Stack>

                  {meeting.summary && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}
                    >
                      {meeting.summary}
                    </Typography>
                  )}
                </CardContent>

                <Divider sx={{ width: '100%' }} />

                <Box sx={{ px: 2, py: 1.5, width: '100%', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {meeting.participants.length > 0 && (
                    <Chip
                      icon={<PeopleIcon />}
                      label={`${meeting.participants.length} participant${meeting.participants.length !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {pendingCount(meeting) > 0 && (
                    <Chip
                      label={`${pendingCount(meeting)} open`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
