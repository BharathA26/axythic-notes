import { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Avatar, Chip, Select, MenuItem, IconButton, Tooltip, CircularProgress,
  Alert, Paper, TableContainer, FormControl,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useQuery, useMutation, gql } from '@apollo/client';

const ALL_USERS = gql`
  query AllUsers($page: Int, $limit: Int) {
    allUsers(page: $page, limit: $limit) {
      total
      users {
        id email displayName photoURL role isActive lastLogin createdAt
      }
    }
  }
`;

const UPDATE_ROLE = gql`
  mutation UpdateUserRole($userId: ID!, $role: Role!) {
    updateUserRole(userId: $userId, role: $role) {
      id role
    }
  }
`;

const DEACTIVATE_USER = gql`
  mutation DeactivateUser($userId: ID!) {
    deactivateUser(userId: $userId) {
      id isActive
    }
  }
`;

// ─── Confirmation dialog state ────────────────────────────────────────────────
interface RoleConfirm {
  open:     boolean;
  userId:   string;
  userName: string;
  newRole:  string;
  oldRole:  string;
}

const CLOSED_CONFIRM: RoleConfirm = { open: false, userId: '', userName: '', newRole: '', oldRole: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { data, loading, error } = useQuery(ALL_USERS, { variables: { page: 1, limit: 50 } });
  const [updateRole]     = useMutation(UPDATE_ROLE, { refetchQueries: ['AllUsers'] });
  const [deactivateUser] = useMutation(DEACTIVATE_USER, { refetchQueries: ['AllUsers'] });
  const [actionError, setActionError] = useState('');
  const [roleConfirm, setRoleConfirm] = useState<RoleConfirm>(CLOSED_CONFIRM);

  // Open confirmation dialog instead of applying immediately
  const requestRoleChange = (userId: string, userName: string, oldRole: string, newRole: string) => {
    if (newRole === oldRole) return;
    setRoleConfirm({ open: true, userId, userName, newRole, oldRole });
  };

  const confirmRoleChange = async () => {
    const { userId, newRole } = roleConfirm;
    setRoleConfirm(CLOSED_CONFIRM);
    try {
      await updateRole({ variables: { userId, role: newRole } });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const handleDeactivate = async (userId: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to sign in.`)) return;
    try {
      await deactivateUser({ variables: { userId } });
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress />
    </Box>
  );

  if (error) return <Alert severity="error">{error.message}</Alert>;

  const users = data?.allUsers?.users ?? [];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Users ({data?.allUsers?.total ?? 0})
      </Typography>

      {actionError && (
        <Alert severity="error" onClose={() => setActionError('')} sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'text.secondary' } }}>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user: any) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }}>
                      {user.displayName?.[0]}
                    </Avatar>
                    <Typography variant="body2" fontWeight={500}>{user.displayName}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                </TableCell>
                <TableCell>
                  <FormControl size="small">
                    <Select
                      value={user.role}
                      onChange={e => requestRoleChange(user.id, user.displayName, user.role, e.target.value)}
                      sx={{ fontSize: 13 }}
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Active' : 'Inactive'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {user.isActive && (
                    <Tooltip title="Deactivate user">
                      <IconButton size="small" onClick={() => handleDeactivate(user.id, user.displayName)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Role change confirmation dialog */}
      <Dialog open={roleConfirm.open} onClose={() => setRoleConfirm(CLOSED_CONFIRM)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Role</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Change <strong>{roleConfirm.userName}</strong>'s role from{' '}
            <strong>{roleConfirm.oldRole}</strong> to <strong>{roleConfirm.newRole}</strong>?
            {roleConfirm.newRole === 'admin' && (
              <><br /><br />This will grant them full admin access to all meetings and users.</>
            )}
            {roleConfirm.oldRole === 'admin' && roleConfirm.newRole === 'user' && (
              <><br /><br />This will remove their admin privileges.</>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleConfirm(CLOSED_CONFIRM)}>Cancel</Button>
          <Button onClick={confirmRoleChange} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
