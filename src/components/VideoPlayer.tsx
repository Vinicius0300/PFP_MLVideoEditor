import { useRef, useEffect } from 'react';
import { Box, IconButton, Slider, Stack, Typography, Paper, Tooltip } from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Bookmark,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';

export function VideoPlayer() {
  const { state, dispatch } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!videoRef.current || !state.videoUrl) return;

    videoRef.current.src = state.videoUrl;
  }, [state.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.videoMetadata) return;

    // NÃO atualizar currentTime durante reprodução
    // Isso causava conflito: o vídeo tocava naturalmente mas o useEffect ficava forçando currentTime
    if (state.isPlaying) return;

    const frameTime = 1 / state.videoMetadata.frameRate;
    const targetTime = state.currentFrame * frameTime;

    video.currentTime = targetTime;
  }, [state.currentFrame, state.videoMetadata, state.isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.videoMetadata) return;

    if (state.isPlaying) {
      let isActive = true;

      const updateFrame = () => {
        if (!isActive || !state.videoMetadata) return;

        const frameNumber = Math.floor(
          video.currentTime * state.videoMetadata.frameRate
        );

        if (frameNumber !== state.currentFrame) {
          dispatch({ type: 'SET_CURRENT_FRAME', payload: frameNumber });
        }

        if (!video.paused && !video.ended && isActive) {
          animationFrameRef.current = requestAnimationFrame(updateFrame);
        } else if (video.ended) {
          // Video acabou
          dispatch({ type: 'TOGGLE_PLAY' });
        }
      };

      // Esperar o play resolver antes de iniciar o loop
      video.play()
        .then(() => {
          if (isActive) {
            animationFrameRef.current = requestAnimationFrame(updateFrame);
          }
        })
        .catch((err) => {
          console.error('Erro ao reproduzir vídeo:', err);
          dispatch({ type: 'TOGGLE_PLAY' });
        });

      return () => {
        isActive = false;
        video.pause();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      // Garantir que o vídeo está pausado
      video.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
  }, [state.isPlaying, state.videoMetadata, dispatch]);

  const handlePlayPause = () => {
    dispatch({ type: 'TOGGLE_PLAY' });
  };

  const handleNextFrame = () => {
    if (!state.videoMetadata) return;

    // Pausar vídeo se estiver tocando
    if (state.isPlaying) {
      dispatch({ type: 'TOGGLE_PLAY' });
    }

    const nextFrame = Math.min(
      state.currentFrame + 1,
      state.videoMetadata.totalFrames - 1
    );
    dispatch({ type: 'SET_CURRENT_FRAME', payload: nextFrame });
  };

  const handlePreviousFrame = () => {
    // Pausar vídeo se estiver tocando
    if (state.isPlaying) {
      dispatch({ type: 'TOGGLE_PLAY' });
    }

    const prevFrame = Math.max(state.currentFrame - 1, 0);
    dispatch({ type: 'SET_CURRENT_FRAME', payload: prevFrame });
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    // Pausar vídeo se estiver tocando
    if (state.isPlaying) {
      dispatch({ type: 'TOGGLE_PLAY' });
    }

    dispatch({ type: 'SET_CURRENT_FRAME', payload: value as number });
  };

  const handleSaveFrame = () => {
    if (!state.videoMetadata) return;

    const frameId = `frame-${Date.now()}`;
    const frameOfInterest = {
      id: frameId,
      name: `Frame ${state.currentFrame}`,
      frameNumber: state.currentFrame,
      timestamp: state.currentFrame / state.videoMetadata.frameRate,
      geometries: [],
      visible: true,
    };

    dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frameOfInterest });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!state.videoUrl || !state.videoMetadata) {
    return null;
  }

  const currentTime = state.currentFrame / state.videoMetadata.frameRate;

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 1, mb: 2 }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        />
      </Box>

      <Stack spacing={2}>
        <Box sx={{ px: 1 }}>
          <Slider
            value={state.currentFrame}
            min={0}
            max={state.videoMetadata.totalFrames - 1}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `Frame ${value}`}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">
              {formatTime(currentTime)} / {formatTime(state.videoMetadata.duration)}
            </Typography>
            <Typography variant="caption">
              Frame: {state.currentFrame} / {state.videoMetadata.totalFrames - 1}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
          <Tooltip title="Frame anterior">
            <IconButton onClick={handlePreviousFrame} size="large">
              <SkipPrevious />
            </IconButton>
          </Tooltip>

          <Tooltip title={state.isPlaying ? 'Pausar' : 'Reproduzir'}>
            <IconButton onClick={handlePlayPause} size="large" color="primary">
              {state.isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Próximo frame">
            <IconButton onClick={handleNextFrame} size="large">
              <SkipNext />
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Salvar como frame de interesse">
            <IconButton onClick={handleSaveFrame} color="secondary">
              <Bookmark />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
