import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, Box, Divider, Tooltip, IconButton,
} from '@mui/material';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import MeetingRoomIcon  from '@mui/icons-material/MeetingRoom';
import PeopleIcon       from '@mui/icons-material/People';
import BarChartIcon     from '@mui/icons-material/BarChart';
import LogoutIcon       from '@mui/icons-material/Logout';
import { useAuth }      from '../context/AuthContext';

const DRAWER_WIDTH = 220;

const navItems = [
  { label: 'My Meetings',  icon: <DashboardIcon />,   path: '/',            adminOnly: false },
  { label: 'All Meetings', icon: <MeetingRoomIcon />,  path: '/admin/meetings', adminOnly: true },
  { label: 'Users',        icon: <PeopleIcon />,       path: '/admin/users', adminOnly: true },
  { label: 'Stats',        icon: <BarChartIcon />,     path: '/admin/stats', adminOnly: true },
];

export default function Sidebar() {
  const { appUser, isAdmin, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Brand */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Typography variant="h6" fontWeight={700} color="primary.main">
          Axythic Notes
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Meeting Intelligence
        </Typography>
      </Box>
      <Divider />

      {/* Nav */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems
          .filter(item => !item.adminOnly || isAdmin)
          .map(item => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                '&.Mui-selected': {
                  background: 'rgba(79,110,247,0.12)',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
            </ListItemButton>
          ))
        }
      </List>

      <Divider />

      {/* User info */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar src={appUser?.photoURL} sx={{ width: 34, height: 34 }}>
          {appUser?.displayName?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography variant="body2" fontWeight={600} noWrap>{appUser?.displayName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {appUser?.role === 'admin' ? '👑 Admin' : 'User'}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={logout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
}
