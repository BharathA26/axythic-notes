import { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Tooltip, CircularProgress, Alert, Paper, TableContainer,
  TextField, InputAdornment,
} from '@mui/material';
import DeleteIcon  from '@mui/icons-material/Delete';
import SearchIcon  from '@mui/icons-material/Search';
import OpenInNew   from '@mui/icons-material/OpenInNew';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const ALL_MEETINGS = gql`
  query AllMeetings($page: Int, $limit: Int, $search: String) {
    allMeetings(page: $page, limit: $limit, search: $search) {
      total meetings {
        id title date duration participants
        createdBy { displayName email }
        actionItems { status }
        createdAt
      }
    }
  }
`;

const DELETE_MEETING = gql`
  mutation DeleteMeeting($meetingId: ID!) {
    deleteMeeting(meetingId: $meetingId)
  }
`;

export default function AdminMeetings() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading, error } = useQuery(ALL_MEETINGS, {
    variables: { page: 1, limit: 50, search: search || undefined },
  });
  const [deleteMeeting] = useMutation(DELETE_MEETING, { refetchQueries: ['AllMeetings'] });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteMeeting({ variables: { meetingId: id } });
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error.message}</Alert>;

  const meetings = data?.allMeetings?.meetings ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          All Meetings ({data?.allMeetings?.total ?? 0})
        </Typography>
        <TextField
          size="small"
          placeholder="Search meetings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 240 }}
        />
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'text.secondary' } }}>
              <TableCell>Title</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Participants</TableCell>
              <TableCell>Action Items</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.map((m: any) => {
              const open      = m.actionItems.filter((a: any) => a.status !== 'completed').length;
              const completed = m.actionItems.filter((a: any) => a.status === 'completed').length;
              return (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{m.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {m.createdBy?.displayName ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(m.date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={m.participants.length} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {open > 0       && <Chip label={`${open} open`}      color="warning" size="small" />}
                      {completed > 0  && <Chip label={`${completed} done`} color="success" size="small" />}
                      {m.actionItems.length === 0 && <Typography variant="caption" color="text.secondary">None</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View meeting">
                      <IconButton size="small" onClick={() => navigate(`/meetings/${m.id}`)}>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete meeting">
                      <IconButton size="small" color="error" onClick={() => handleDelete(m.id, m.title)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
