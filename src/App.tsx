import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AppProvider, useApp } from './contexts/AppContext';
import { Box, AppBar, Toolbar, Typography, Stack, Button, Chip } from '@mui/material';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayerWithCanvas } from './components/VideoPlayerWithCanvas';
import { ToolBar } from './components/ToolBar';
import { FramesSidebar } from './components/FramesSidebar';
import { VideoLibrary } from '@mui/icons-material';

const APP_VERSION = '1.0.6';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AppContent() {
  const { state, dispatch } = useApp();

  const handleChangeVideo = () => {
    if (window.confirm('Tem certeza que deseja trocar o vídeo? Todas as anotações serão perdidas.')) {
      dispatch({ type: 'CLEAR_VIDEO' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            VideoML Editor - Análise de Vídeos Médicos
            <Chip
              label={`v${APP_VERSION}`}
              size="small"
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Typography>
          {state.videoUrl && (
            <Button
              color="inherit"
              startIcon={<VideoLibrary />}
              onClick={handleChangeVideo}
            >
              Trocar Vídeo
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {!state.videoUrl ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
            }}
          >
            <VideoUpload />
          </Box>
        ) : (
          <Stack direction="row" spacing={2} sx={{ flexGrow: 1, p: 2 }}>
            <Box sx={{ width: '200px', flexShrink: 0 }}>
              <ToolBar />
            </Box>

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <VideoPlayerWithCanvas />
            </Box>

            <Box sx={{ width: '300px', flexShrink: 0, overflow: 'auto' }}>
              <FramesSidebar />
            </Box>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
