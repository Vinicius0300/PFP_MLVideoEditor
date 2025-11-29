import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AppProvider, useApp } from './contexts/AppContext';
import { Box, Container, AppBar, Toolbar, Typography, Stack, Button } from '@mui/material';
import { VideoUpload } from './components/VideoUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { AnnotationCanvas } from './components/AnnotationCanvas';
import { ToolBar } from './components/ToolBar';
import { FramesSidebar } from './components/FramesSidebar';
import { VideoLibrary } from '@mui/icons-material';

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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            VideoML Editor - Análise de Vídeos Médicos
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

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <VideoPlayer />
              <AnnotationCanvas />
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
