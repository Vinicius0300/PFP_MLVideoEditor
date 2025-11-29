import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Group, Image as KonvaImage } from 'react-konva';
import { Box, Paper, IconButton, Slider, Stack, Typography, Tooltip } from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Bookmark,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import type { Geometry, Point } from '../types';
import Konva from 'konva';

export function VideoPlayerWithCanvas() {
  const { state, dispatch } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoImage, setVideoImage] = useState<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Configurar vídeo
  useEffect(() => {
    if (!videoRef.current || !state.videoUrl) return;
    videoRef.current.src = state.videoUrl;
    setVideoImage(videoRef.current);
  }, [state.videoUrl]);

  // Atualizar dimensões
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current && state.videoMetadata) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const aspectRatio = state.videoMetadata.width / state.videoMetadata.height;
        const height = containerWidth / aspectRatio;

        setDimensions({
          width: containerWidth,
          height: height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [state.videoMetadata]);

  // Sincronizar currentTime e forçar redraw do canvas
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.videoMetadata) return;

    const frameTime = 1 / state.videoMetadata.frameRate;
    const targetTime = state.currentFrame * frameTime;

    video.currentTime = targetTime;

    // Forçar redraw do layer de vídeo quando o frame muda
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  }, [state.currentFrame, state.videoMetadata]);

  // Controle de Play/Pause
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
          dispatch({ type: 'TOGGLE_PLAY' });
        }
      };

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
      video.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
  }, [state.isPlaying, state.videoMetadata, dispatch]);

  const getCurrentFrameOfInterest = () => {
    return state.framesOfInterest.find(
      (frame) => frame.frameNumber === state.currentFrame
    );
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.currentTool === 'select' || state.currentTool === 'move') return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const point = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };

    if (state.currentTool === 'point') {
      let frameOfInterest = getCurrentFrameOfInterest();

      if (!frameOfInterest) {
        const frameId = `frame-${Date.now()}`;
        frameOfInterest = {
          id: frameId,
          name: `Frame ${state.currentFrame}`,
          frameNumber: state.currentFrame,
          timestamp: state.currentFrame / (state.videoMetadata?.frameRate || 30),
          geometries: [],
          visible: true,
        };
        dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frameOfInterest });
      }

      const geometry: Geometry = {
        id: `geo-${Date.now()}`,
        type: 'point',
        name: `ponto-${frameOfInterest.geometries.length + 1}`,
        frameId: frameOfInterest.id,
        visible: true,
        points: [point],
        color: '#00ff00',
        strokeWidth: 2,
      };

      dispatch({
        type: 'ADD_GEOMETRY',
        payload: { frameId: frameOfInterest.id, geometry },
      });

      return;
    }

    setIsDrawing(true);
    setCurrentDrawing([point]);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;

    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const point = {
      x: pos.x / dimensions.width,
      y: pos.y / dimensions.height,
    };

    if (state.currentTool === 'line') {
      setCurrentDrawing([currentDrawing[0], point]);
    } else if (state.currentTool === 'freehand' || state.currentTool === 'brush') {
      setCurrentDrawing([...currentDrawing, point]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentDrawing.length === 0) return;

    let frameOfInterest = getCurrentFrameOfInterest();

    if (!frameOfInterest) {
      const frameId = `frame-${Date.now()}`;
      frameOfInterest = {
        id: frameId,
        name: `Frame ${state.currentFrame}`,
        frameNumber: state.currentFrame,
        timestamp: state.currentFrame / (state.videoMetadata?.frameRate || 30),
        geometries: [],
        visible: true,
      };
      dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frameOfInterest });
    }

    const geometryType =
      state.currentTool === 'line'
        ? 'line'
        : state.currentTool === 'brush'
        ? 'brush'
        : 'freehand';

    const geometry: Geometry = {
      id: `geo-${Date.now()}`,
      type: geometryType,
      name: `${geometryType}-${frameOfInterest.geometries.length + 1}`,
      frameId: frameOfInterest.id,
      visible: true,
      points: currentDrawing,
      color: state.currentTool === 'brush' && state.brushMode === 'subtract' ? '#ff0000' : '#00ff00',
      strokeWidth: state.currentTool === 'brush' ? 10 : 2,
      closed: state.currentTool === 'freehand',
    };

    dispatch({
      type: 'ADD_GEOMETRY',
      payload: { frameId: frameOfInterest.id, geometry },
    });

    setIsDrawing(false);
    setCurrentDrawing([]);
  };

  const renderGeometry = (geometry: Geometry) => {
    if (!geometry.visible) return null;

    const points = geometry.points.flatMap((p) => [
      p.x * dimensions.width,
      p.y * dimensions.height,
    ]);

    if (geometry.type === 'point') {
      return (
        <Circle
          key={geometry.id}
          x={geometry.points[0].x * dimensions.width}
          y={geometry.points[0].y * dimensions.height}
          radius={5}
          fill={geometry.color}
          stroke={geometry.color}
          strokeWidth={2}
        />
      );
    }

    if (geometry.type === 'line') {
      return (
        <Line
          key={geometry.id}
          points={points}
          stroke={geometry.color}
          strokeWidth={geometry.strokeWidth || 2}
        />
      );
    }

    if (geometry.type === 'freehand' || geometry.type === 'brush') {
      return (
        <Line
          key={geometry.id}
          points={points}
          stroke={geometry.color}
          strokeWidth={geometry.strokeWidth || 2}
          closed={geometry.closed}
        />
      );
    }

    return null;
  };

  const handlePlayPause = () => {
    dispatch({ type: 'TOGGLE_PLAY' });
  };

  const handleNextFrame = () => {
    if (!state.videoMetadata) return;

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
    if (state.isPlaying) {
      dispatch({ type: 'TOGGLE_PLAY' });
    }

    const prevFrame = Math.max(state.currentFrame - 1, 0);
    dispatch({ type: 'SET_CURRENT_FRAME', payload: prevFrame });
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
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
  const currentFrameOfInterest = getCurrentFrameOfInterest();
  const geometries = currentFrameOfInterest?.geometries || [];

  const currentDrawingPoints = currentDrawing.flatMap((p) => [
    p.x * dimensions.width,
    p.y * dimensions.height,
  ]);

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <Paper sx={{ p: 2 }}>
        {/* Vídeo escondido */}
        <video
          ref={videoRef}
          style={{ display: 'none' }}
        />

        {/* Canvas com vídeo e geometrias */}
        <Box sx={{ position: 'relative', bgcolor: 'black', borderRadius: 1, mb: 2 }}>
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Layer ref={layerRef}>
              {/* Vídeo como imagem de fundo */}
              {videoImage && (
                <KonvaImage
                  image={videoImage}
                  width={dimensions.width}
                  height={dimensions.height}
                />
              )}
            </Layer>
            <Layer>
              <Group>
                {geometries.map((geo) => renderGeometry(geo))}
                {/* Preview durante desenho */}
                {isDrawing && currentDrawingPoints.length > 0 && (
                  <>
                    {state.currentTool === 'line' && currentDrawing.length === 2 && (
                      <>
                        <Line
                          points={currentDrawingPoints}
                          stroke="#00ff00"
                          strokeWidth={2}
                          dash={[5, 5]}
                        />
                        <Circle
                          x={currentDrawing[0].x * dimensions.width}
                          y={currentDrawing[0].y * dimensions.height}
                          radius={5}
                          fill="#00ff00"
                        />
                        <Circle
                          x={currentDrawing[1].x * dimensions.width}
                          y={currentDrawing[1].y * dimensions.height}
                          radius={5}
                          fill="#00ff00"
                        />
                      </>
                    )}
                    {(state.currentTool === 'freehand' || state.currentTool === 'brush') && (
                      <Line
                        points={currentDrawingPoints}
                        stroke={state.currentTool === 'brush' && state.brushMode === 'subtract' ? '#ff0000' : '#00ff00'}
                        strokeWidth={state.currentTool === 'brush' ? 10 : 2}
                        closed={state.currentTool === 'freehand'}
                        opacity={0.7}
                      />
                    )}
                  </>
                )}
              </Group>
            </Layer>
          </Stage>
        </Box>

        {/* Controles */}
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
    </Box>
  );
}
