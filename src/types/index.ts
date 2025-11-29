export type Point = {
  x: number;
  y: number;
};

export type ToolType =
  | 'select'
  | 'point'
  | 'line'
  | 'freehand'
  | 'brush'
  | 'move'
  | 'perpendicular';

export type GeometryType = 'point' | 'line' | 'freehand' | 'brush';

export interface Geometry {
  id: string;
  type: GeometryType;
  name: string;
  frameId: string;
  visible: boolean;
  points: Point[];
  color: string;
  strokeWidth?: number;
  closed?: boolean;
}

export interface FrameOfInterest {
  id: string;
  name: string;
  frameNumber: number;
  timestamp: number;
  geometries: Geometry[];
  visible: boolean;
}

export interface VideoMetadata {
  name: string;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  totalFrames: number;
}

export interface AppState {
  videoUrl: string | null;
  videoMetadata: VideoMetadata | null;
  currentFrame: number;
  isPlaying: boolean;
  framesOfInterest: FrameOfInterest[];
  selectedFrameId: string | null;
  selectedGeometryId: string | null;
  currentTool: ToolType;
  brushMode: 'add' | 'subtract';
  zoomLevel: number;
}

export interface Measurement {
  id: string;
  geometryId: string;
  type: 'distance' | 'area';
  value: number;
  unit: string;
}
