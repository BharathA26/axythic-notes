import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, CircularProgress, Alert, Chip, Stack,
  Tabs, Tab, Paper, Avatar, IconButton, Select, MenuItem, Divider,
  Tooltip, Card, CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useQuery, useMutation, gql } from '@apollo/client';
import type { Meeting, ActionItem } from '../types/meeting';

// ─── GraphQL Documents ────────────────────────────────────────────────────────

const MEETING_QUERY = gql`
  query GetMeeting($id: ID!) {
    meeting(id: $id) {
      id
      title
      createdAt
      participants
      summary
      mom
      transcript
      actionItems {
        id
        description
        assignee
        dueDate
        status
      }
    }
  }
`;

// updateActionItem now returns Meeting! — we select the fields we need to
// update the Apollo cache automatically.
const UPDATE_ACTION_MUTATION = gql`
  mutation UpdateActionItem($meetingId: ID!, $actionId: ID!, $status: ActionStatus!) {
    updateActionItem(meetingId: $meetingId, actionId: $actionId, status: $status) {
      id
      actionItems {
        id
        description
        assignee
        dueDate
        status
      }
    }
  }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ActionItem['status'], 'default' | 'warning' | 'success'> = {
  pending:     'default',
  in_progress: 'warning',
  completed:   'success',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [mutationError, setMutationError] = useState('');

  // ── Fetch meeting via Apollo (auth header attached automatically) ──────────
  const { data, loading, error } = useQuery<{ meeting: Meeting | null }>(
    MEETING_QUERY,
    { variables: { id }, fetchPolicy: 'cache-and-network' }
  );

  // ── Update action item — Apollo updates the cache from the returned Meeting
  const [updateActionItem] = useMutation(UPDATE_ACTION_MUTATION, {
    onError: (err) => setMutationError(err.message),
  });

  const handleStatusChange = (actionId: string, status: ActionItem['status']) => {
    setMutationError('');
    updateActionItem({ variables: { meetingId: id, actionId, status } });
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data?.meeting) {
    return (
      <Container maxWidth="md" sx={{ pt: 6 }}>
        <Alert severity="error">
          {error?.message ?? 'Meeting not found.'}
        </Alert>
      </Container>
    );
  }

  const meeting = data.meeting;
  const completedActions = meeting.actionItems.filter(a => a.status === 'completed').length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Tooltip title="Back to Dashboard">
              <IconButton size="small" onClick={() => navigate('/')}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {meeting.title}
              </Typography>
              <Stack direction="row" alignItems="center" gap={2} sx={{ mt: 0.5 }}>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(meeting.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </Typography>
                </Stack>
                {meeting.participants.length > 0 && (
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <PeopleIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {meeting.participants.join(', ')}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>
            {meeting.actionItems.length > 0 && (
              <Chip
                label={`${completedActions}/${meeting.actionItems.length} done`}
                color={completedActions === meeting.actionItems.length ? 'success' : 'default'}
                size="small"
              />
            )}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {mutationError && (
          <Alert severity="error" onClose={() => setMutationError('')} sx={{ mb: 2 }}>
            {mutationError}
          </Alert>
        )}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          <Tab label="Summary" />
          <Tab label="Minutes of Meeting" />
          <Tab label={`Action Items (${meeting.actionItems.length})`} />
          <Tab label="Transcript" />
        </Tabs>
        <Divider />

        {/* Summary */}
        <TabPanel value={tab} index={0}>
          {meeting.summary ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {meeting.summary}
              </Typography>
            </Paper>
          ) : (
            <Typography color="text.secondary" variant="body2">No summary available.</Typography>
          )}
        </TabPanel>

        {/* Minutes of Meeting */}
        <TabPanel value={tab} index={1}>
          {meeting.mom ? (
            <Paper sx={{ p: 3 }}>
              <Typography
                variant="body2"
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8, color: 'text.secondary' }}
              >
                {meeting.mom}
              </Typography>
            </Paper>
          ) : (
            <Typography color="text.secondary" variant="body2">No minutes available.</Typography>
          )}
        </TabPanel>

        {/* Action Items */}
        <TabPanel value={tab} index={2}>
          {meeting.actionItems.length === 0 ? (
            <Typography color="text.secondary" variant="body2">No action items.</Typography>
          ) : (
            <Stack gap={1.5}>
              {meeting.actionItems.map(action => (
                <Card key={action.id}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                    <Avatar sx={{ bgcolor: 'rgba(79,110,247,0.12)', color: 'primary.main', width: 36, height: 36, fontSize: 13, fontWeight: 700 }}>
                      {action.assignee?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{action.description}</Typography>
                      <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{action.assignee}</Typography>
                        {action.dueDate && action.dueDate !== 'TBD' && (
                          <>
                            <Typography variant="caption" color="text.secondary">·</Typography>
                            <Typography variant="caption" color="text.secondary">Due {action.dueDate}</Typography>
                          </>
                        )}
                      </Stack>
                    </Box>
                    <Select
                      value={action.status}
                      size="small"
                      onChange={e => handleStatusChange(action.id, e.target.value as ActionItem['status'])}
                      sx={{ fontSize: 12, minWidth: 120 }}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                    <Chip
                      label={action.status.replace('_', ' ')}
                      color={STATUS_COLORS[action.status]}
                      size="small"
                      sx={{ minWidth: 80, display: { xs: 'none', sm: 'flex' } }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>

        {/* Transcript */}
        <TabPanel value={tab} index={3}>
          {meeting.transcript ? (
            <Paper sx={{ p: 3, maxHeight: '60vh', overflow: 'auto' }}>
              <Typography
                variant="body2"
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: '"JetBrains Mono", monospace', fontSize: 12, lineHeight: 1.8, color: 'text.secondary' }}
              >
                {meeting.transcript}
              </Typography>
            </Paper>
          ) : (
            <Typography color="text.secondary" variant="body2">No transcript available.</Typography>
          )}
        </TabPanel>
      </Container>
    </Box>
  );
}
