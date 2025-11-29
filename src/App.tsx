import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AppProvider, useApp } from './contexts/AppContext';
import { Box, Container, AppBar, Toolbar, Typography, Stack, Button, Chip } from '@mui/material';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayerWithCanvas } from './components/VideoPlayerWithCanvas';
import { ToolBar } from './components/ToolBar';
import { FramesSidebar } from './components/FramesSidebar';
import { VideoLibrary } from '@mui/icons-material';

const APP_VERSION = '1.0.5';

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

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3, flexGrow: 1 }}>
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
          <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
            <Box sx={{ width: '200px', flexShrink: 0 }}>
              <ToolBar />
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              <VideoPlayerWithCanvas />
            </Box>

            <Box sx={{ width: '300px', flexShrink: 0 }}>
              <FramesSidebar />
            </Box>
          </Stack>
        )}
      </Container>
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
