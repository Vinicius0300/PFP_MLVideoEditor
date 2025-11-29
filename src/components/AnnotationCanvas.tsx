import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Group } from 'react-konva';
import { Box, Paper } from '@mui/material';
import { useApp } from '../contexts/AppContext';
import type { Geometry, Point } from '../types';
import Konva from 'konva';

export function AnnotationCanvas() {
  const { state, dispatch } = useApp();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [currentDrawing, setCurrentDrawing] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

    // Para PONTOS: criar imediatamente sem esperar mouseUp
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

      return; // Não ativa modo de desenho para pontos
    }

    // Para LINHAS, FREEHAND e BRUSH: ativar modo de desenho
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
      state.currentTool === 'point'
        ? 'point'
        : state.currentTool === 'line'
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
          fill={geometry.closed ? geometry.color + '40' : undefined}
        />
      );
    }

    return null;
  };

  const currentFrameOfInterest = getCurrentFrameOfInterest();
  const geometries = currentFrameOfInterest?.geometries || [];

  const currentDrawingPoints = currentDrawing.flatMap((p) => [
    p.x * dimensions.width,
    p.y * dimensions.height,
  ]);

  if (!state.videoUrl) {
    return null;
  }

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Stage
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            <Group>
              {geometries.map((geo) => renderGeometry(geo))}
              {/* Preview durante desenho */}
              {isDrawing && currentDrawingPoints.length > 0 && (
                <>
                  {/* Para LINHAS: mostrar linha sendo formada */}
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
                  {/* Para FREEHAND e BRUSH: mostrar traço sendo desenhado */}
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
      </Paper>
    </Box>
  );
}
