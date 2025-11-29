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
import type {
  Point,
  Annotation,
  PointData,
  LineData,
  MaskPath,
  PointsAnnotation,
  LinesAnnotation,
  MasksAnnotation
} from '../types';
import Konva from 'konva';
import { generateBrushOutline, unifyMaskPaths } from '../utils/polygonUtils';

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

    // NÃO atualizar currentTime durante reprodução
    // Isso causava conflito: o vídeo tocava naturalmente mas o useEffect ficava forçando currentTime
    if (state.isPlaying) {
      // Durante reprodução, apenas forçar redraw do canvas
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
      return;
    }

    const frameTime = 1 / state.videoMetadata.frameRate;
    const targetTime = state.currentFrame * frameTime;

    video.currentTime = targetTime;

    // Forçar redraw do layer de vídeo quando o frame muda
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  }, [state.currentFrame, state.videoMetadata, state.isPlaying]);

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
          annotations: [],
          visible: true,
        };
        dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frameOfInterest });
      }

      // Check if points annotation already exists
      let pointsAnnotation = frameOfInterest.annotations.find(
        (ann) => ann.type === 'points'
      );

      if (!pointsAnnotation) {
        // Create new points annotation
        const annotation: Annotation = {
          id: `ann-points-${Date.now()}`,
          type: 'points',
          name: 'Pontos',
          frameId: frameOfInterest.id,
          visible: true,
          isEditing: true,
          data: {
            type: 'points',
            points: [],
          },
        };
        dispatch({
          type: 'ADD_ANNOTATION',
          payload: { frameId: frameOfInterest.id, annotation },
        });
        pointsAnnotation = annotation;
      }

      // Add point to annotation (if in edit mode or just created)
      if (pointsAnnotation.isEditing) {
        const newPoint: PointData = {
          id: `point-${Date.now()}`,
          x: point.x,
          y: point.y,
        };
        dispatch({
          type: 'ADD_POINT_TO_ANNOTATION',
          payload: {
            frameId: frameOfInterest.id,
            annotationId: pointsAnnotation.id,
            point: newPoint,
          },
        });
      }

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
        annotations: [],
        visible: true,
      };
      dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frameOfInterest });
    }

    if (state.currentTool === 'line') {
      if (currentDrawing.length < 2) {
        setIsDrawing(false);
        setCurrentDrawing([]);
        return;
      }

      // Check if lines annotation exists
      let linesAnnotation = frameOfInterest.annotations.find(
        (ann) => ann.type === 'lines'
      );

      if (!linesAnnotation) {
        const annotation: Annotation = {
          id: `ann-lines-${Date.now()}`,
          type: 'lines',
          name: 'Retas',
          frameId: frameOfInterest.id,
          visible: true,
          isEditing: true,
          data: {
            type: 'lines',
            lines: [],
          },
        };
        dispatch({
          type: 'ADD_ANNOTATION',
          payload: { frameId: frameOfInterest.id, annotation },
        });
        linesAnnotation = annotation;
      }

      if (linesAnnotation.isEditing) {
        // Calculate length and angle
        const dx = currentDrawing[1].x - currentDrawing[0].x;
        const dy = currentDrawing[1].y - currentDrawing[0].y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        const newLine: LineData = {
          id: `line-${Date.now()}`,
          p1: currentDrawing[0],
          p2: currentDrawing[1],
          length,
          angle,
        };

        dispatch({
          type: 'ADD_LINE_TO_ANNOTATION',
          payload: {
            frameId: frameOfInterest.id,
            annotationId: linesAnnotation.id,
            line: newLine,
          },
        });
      }
    } else if (state.currentTool === 'freehand' || state.currentTool === 'brush') {
      // Check if masks annotation exists
      let masksAnnotation = frameOfInterest.annotations.find(
        (ann) => ann.type === 'masks'
      );

      if (!masksAnnotation) {
        const annotation: Annotation = {
          id: `ann-masks-${Date.now()}`,
          type: 'masks',
          name: 'Máscaras',
          frameId: frameOfInterest.id,
          visible: true,
          isEditing: true,
          data: {
            type: 'masks',
            paths: [],
            unified: null,
          },
        };
        dispatch({
          type: 'ADD_ANNOTATION',
          payload: { frameId: frameOfInterest.id, annotation },
        });
        masksAnnotation = annotation;
      }

      if (masksAnnotation.isEditing) {
        const newPath: MaskPath = {
          id: `path-${Date.now()}`,
          points: currentDrawing,
          type: state.currentTool === 'brush' ? 'brush' : 'freehand',
        };

        // Adicionar o novo path
        dispatch({
          type: 'ADD_MASK_PATH_TO_ANNOTATION',
          payload: {
            frameId: frameOfInterest.id,
            annotationId: masksAnnotation.id,
            path: newPath,
          },
        });

        // Calcular união de polígonos
        // Obter todos os paths incluindo o novo
        const masksData = masksAnnotation.data as MasksAnnotation;
        const allPaths = [...masksData.paths, newPath];

        // Unificar os polígonos
        const unified = unifyMaskPaths(allPaths, state.brushSize);

        if (unified) {
          dispatch({
            type: 'UPDATE_MASK_UNION',
            payload: {
              frameId: frameOfInterest.id,
              annotationId: masksAnnotation.id,
              unified,
            },
          });
        }
      }
    }

    setIsDrawing(false);
    setCurrentDrawing([]);
  };

  const renderAnnotation = (annotation: Annotation): React.ReactElement | null => {
    if (!annotation.visible) return null;

    const elements: React.ReactElement[] = [];

    if (annotation.type === 'points') {
      const pointsData = annotation.data as PointsAnnotation;
      pointsData.points.forEach((point: PointData) => {
        elements.push(
          <Circle
            key={point.id}
            x={point.x * dimensions.width}
            y={point.y * dimensions.height}
            radius={5}
            fill="#00ff00"
            stroke="#00ff00"
            strokeWidth={2}
          />
        );
      });
    }

    if (annotation.type === 'lines') {
      const linesData = annotation.data as LinesAnnotation;
      linesData.lines.forEach((line: LineData) => {
        const points = [
          line.p1.x * dimensions.width,
          line.p1.y * dimensions.height,
          line.p2.x * dimensions.width,
          line.p2.y * dimensions.height,
        ];
        elements.push(
          <Line
            key={line.id}
            points={points}
            stroke="#00ff00"
            strokeWidth={2}
          />
        );
      });
    }

    if (annotation.type === 'masks') {
      const masksData = annotation.data as MasksAnnotation;

      // Se temos polígono unificado, renderizar apenas ele
      if (masksData.unified && masksData.unified.length > 0) {
        // Renderizar cada ring do polígono unificado
        masksData.unified.forEach((ring, ringIndex) => {
          const points = ring.flatMap((p: Point) => [
            p.x * dimensions.width,
            p.y * dimensions.height,
          ]);

          // O primeiro ring é o exterior (verde), os demais são buracos (vermelhos)
          const isExterior = ringIndex === 0;

          elements.push(
            <Line
              key={`unified-ring-${ringIndex}`}
              points={points}
              stroke={isExterior ? '#00ff00' : '#ff0000'}
              strokeWidth={2}
              closed={true}
            />
          );
        });
      } else {
        // Se não tem união ainda, renderizar paths individuais
        masksData.paths.forEach((path: MaskPath) => {
          let points: number[];

          if (path.type === 'brush') {
            // Brush circular: gerar contorno circular
            const brushRadius = state.brushSize / dimensions.width / 2; // Converter para coordenadas normalizadas
            const outlinePoints = generateBrushOutline(path.points, brushRadius);
            points = outlinePoints.flatMap((p: Point) => [
              p.x * dimensions.width,
              p.y * dimensions.height,
            ]);
          } else {
            // Freehand: usar pontos diretamente
            points = path.points.flatMap((p: Point) => [
              p.x * dimensions.width,
              p.y * dimensions.height,
            ]);
          }

          const color = state.brushMode === 'subtract' ? '#ff0000' : '#00ff00';

          elements.push(
            <Line
              key={path.id}
              points={points}
              stroke={color}
              strokeWidth={2}
              closed={true} // Tanto brush quanto freehand são polígonos fechados
            />
          );
        });
      }
    }

    return <Group key={annotation.id}>{elements}</Group>;
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
      annotations: [],
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
  const annotations = currentFrameOfInterest?.annotations || [];

  // Gerar pontos de preview baseado na ferramenta
  let currentDrawingPoints: number[] = [];
  if (state.currentTool === 'brush' && currentDrawing.length > 0) {
    // Para brush, gerar contorno circular
    const brushRadius = state.brushSize / dimensions.width / 2;
    const outlinePoints = generateBrushOutline(currentDrawing, brushRadius);
    currentDrawingPoints = outlinePoints.flatMap((p) => [
      p.x * dimensions.width,
      p.y * dimensions.height,
    ]);
  } else {
    // Para outras ferramentas, usar pontos normalmente
    currentDrawingPoints = currentDrawing.flatMap((p) => [
      p.x * dimensions.width,
      p.y * dimensions.height,
    ]);
  }

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
                {annotations.map((ann) => renderAnnotation(ann))}
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
                        stroke={state.brushMode === 'subtract' ? '#ff0000' : '#00ff00'}
                        strokeWidth={2}
                        closed={true} // Brush e freehand são polígonos fechados
                        dash={[5, 5]}
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
