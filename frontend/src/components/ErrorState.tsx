import { Box, Typography, Button, useTheme } from '@mui/material';
import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

interface Props {
  message: string;
  onRetry?: () => void;
  canRetry?: boolean;
}

/** Friendly, actionable error state for routing/network failures. */
export default function ErrorState({ message, onRetry, canRetry }: Props) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        borderRadius: 4,
        border: `1px solid ${theme.palette.error.main}33`,
        bgcolor: theme.palette.mode === 'dark' ? '#2a1518' : '#fef2f2',
        p: { xs: 4, sm: 6 },
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 320,
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '18px',
          display: 'grid',
          placeItems: 'center',
          mb: 2.5,
          color: 'error.main',
          bgcolor: `${theme.palette.error.main}1a`,
        }}
      >
        <CloudOffRoundedIcon sx={{ fontSize: 30 }} />
      </Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        We hit a snag
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
        {message}
      </Typography>
      {canRetry && onRetry && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshRoundedIcon />}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </Box>
  );
}
