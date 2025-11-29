import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Group, Image as KonvaImage } from 'react-konva';
import { Box, Paper, IconButton, Slider, Stack, Typography, Tooltip } from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  Bookmark,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
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
  const stageRef = useRef<Konva.Stage>(null);
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

  // Handlers para drag & drop
  const handlePointDragEnd = (frameId: string, annotationId: string, pointId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x() / dimensions.width;
    const newY = e.target.y() / dimensions.height;

    const frame = state.framesOfInterest.find(f => f.id === frameId);
    if (!frame) return;

    const annotation = frame.annotations.find(a => a.id === annotationId);
    if (!annotation || annotation.type !== 'points') return;

    const pointsData = annotation.data as PointsAnnotation;
    const updatedPoints = pointsData.points.map(p =>
      p.id === pointId ? { ...p, x: newX, y: newY } : p
    );

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        frameId,
        annotationId,
        updates: {
          data: {
            type: 'points',
            points: updatedPoints,
          },
        },
      },
    });
  };

  const handleLineDragEnd = (frameId: string, annotationId: string, lineId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const deltaX = e.target.x() / dimensions.width;
    const deltaY = e.target.y() / dimensions.height;

    const frame = state.framesOfInterest.find(f => f.id === frameId);
    if (!frame) return;

    const annotation = frame.annotations.find(a => a.id === annotationId);
    if (!annotation || annotation.type !== 'lines') return;

    const linesData = annotation.data as LinesAnnotation;
    const line = linesData.lines.find(l => l.id === lineId);
    if (!line) return;

    const newP1 = { x: line.p1.x + deltaX, y: line.p1.y + deltaY };
    const newP2 = { x: line.p2.x + deltaX, y: line.p2.y + deltaY };
    const dx = newP2.x - newP1.x;
    const dy = newP2.y - newP1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    const updatedLines = linesData.lines.map(l =>
      l.id === lineId
        ? { ...l, p1: newP1, p2: newP2, length, angle }
        : l
    );

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        frameId,
        annotationId,
        updates: {
          data: {
            type: 'lines',
            lines: updatedLines,
          },
        },
      },
    });

    // Reset position do Group
    e.target.position({ x: 0, y: 0 });
  };

  const handleMaskDragEnd = (frameId: string, annotationId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const deltaX = e.target.x() / dimensions.width;
    const deltaY = e.target.y() / dimensions.height;

    const frame = state.framesOfInterest.find(f => f.id === frameId);
    if (!frame) return;

    const annotation = frame.annotations.find(a => a.id === annotationId);
    if (!annotation || annotation.type !== 'masks') return;

    const masksData = annotation.data as MasksAnnotation;

    // Mover todos os paths
    const updatedPaths = masksData.paths.map(path => ({
      ...path,
      points: path.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY,
      })),
    }));

    // Mover polígono unificado se existir
    const updatedUnified = masksData.unified
      ? masksData.unified.map(ring =>
          ring.map(p => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }))
        )
      : null;

    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        frameId,
        annotationId,
        updates: {
          data: {
            type: 'masks',
            paths: updatedPaths,
            unified: updatedUnified,
          },
        },
      },
    });

    // Reset position do Group
    e.target.position({ x: 0, y: 0 });
  };

  const renderAnnotation = (annotation: Annotation): React.ReactElement | null => {
    if (!annotation.visible) return null;

    const elements: React.ReactElement[] = [];

    if (annotation.type === 'points') {
      const pointsData = annotation.data as PointsAnnotation;
      const frameId = getCurrentFrameOfInterest()?.id;
      if (!frameId) return null;

      pointsData.points.forEach((point: PointData) => {
        elements.push(
          <Circle
            key={point.id}
            x={point.x * dimensions.width}
            y={point.y * dimensions.height}
            radius={5 / state.zoomLevel} // Tamanho fixo independente do zoom
            fill="#00ff00"
            stroke="#00ff00"
            strokeWidth={2 / state.zoomLevel}
            draggable={state.currentTool === 'select'}
            onDragEnd={(e) => handlePointDragEnd(frameId, annotation.id, point.id, e)}
          />
        );
      });
    }

    if (annotation.type === 'lines') {
      const linesData = annotation.data as LinesAnnotation;
      const frameId = getCurrentFrameOfInterest()?.id;
      if (!frameId) return null;

      linesData.lines.forEach((line: LineData) => {
        const points = [
          line.p1.x * dimensions.width,
          line.p1.y * dimensions.height,
          line.p2.x * dimensions.width,
          line.p2.y * dimensions.height,
        ];
        elements.push(
          <Group
            key={line.id}
            draggable={state.currentTool === 'select'}
            onDragEnd={(e) => handleLineDragEnd(frameId, annotation.id, line.id, e)}
          >
            <Line
              points={points}
              stroke="#00ff00"
              strokeWidth={2 / state.zoomLevel} // Tamanho fixo independente do zoom
            />
          </Group>
        );
      });
    }

    if (annotation.type === 'masks') {
      const masksData = annotation.data as MasksAnnotation;
      const frameId = getCurrentFrameOfInterest()?.id;
      if (!frameId) return null;

      const maskElements: React.ReactElement[] = [];

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

          maskElements.push(
            <Line
              key={`unified-ring-${ringIndex}`}
              points={points}
              stroke={isExterior ? '#00ff00' : '#ff0000'}
              strokeWidth={2 / state.zoomLevel} // Tamanho fixo independente do zoom
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

          maskElements.push(
            <Line
              key={path.id}
              points={points}
              stroke={color}
              strokeWidth={2 / state.zoomLevel} // Tamanho fixo independente do zoom
              closed={true} // Tanto brush quanto freehand são polígonos fechados
            />
          );
        });
      }

      // Agrupar todos os elementos da máscara para permitir drag
      elements.push(
        <Group
          key={`mask-${annotation.id}`}
          draggable={state.currentTool === 'select'}
          onDragEnd={(e) => handleMaskDragEnd(frameId, annotation.id, e)}
        >
          {maskElements}
        </Group>
      );
    }

    return <Group key={annotation.id}>{elements}</Group>;
  };

  const handleZoomIn = () => {
    dispatch({ type: 'SET_ZOOM', payload: Math.min(state.zoomLevel + 0.25, 3) });
  };

  const handleZoomOut = () => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(state.zoomLevel - 0.25, 0.5) });
  };

  const handleResetZoom = () => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
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
        <Box sx={{
          position: 'relative',
          bgcolor: 'black',
          borderRadius: 1,
          mb: 2,
          overflow: 'auto',
          maxHeight: '70vh',
        }}>
          <Stage
            ref={stageRef}
            width={dimensions.width * state.zoomLevel}
            height={dimensions.height * state.zoomLevel}
            scaleX={state.zoomLevel}
            scaleY={state.zoomLevel}
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

            <Box sx={{ borderLeft: 1, borderColor: 'divider', pl: 2, ml: 2 }} />

            <Tooltip title="Diminuir zoom">
              <IconButton onClick={handleZoomOut} disabled={state.zoomLevel <= 0.5}>
                <ZoomOut />
              </IconButton>
            </Tooltip>

            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
              {Math.round(state.zoomLevel * 100)}%
            </Typography>

            <Tooltip title="Aumentar zoom">
              <IconButton onClick={handleZoomIn} disabled={state.zoomLevel >= 3}>
                <ZoomIn />
              </IconButton>
            </Tooltip>

            <Tooltip title="Reset zoom (100%)">
              <IconButton onClick={handleResetZoom} size="small">
                <ZoomOutMap />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
