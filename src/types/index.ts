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

// ========== NOVA ESTRUTURA v1.1.0 ==========

export type AnnotationType = 'points' | 'lines' | 'masks';

// Polygon como array de pontos (compatível com polygon-clipping)
export type Polygon = Point[][];

// Dados de cada tipo de marcação
export interface PointData {
  id: string;
  x: number;
  y: number;
}

export interface LineData {
  id: string;
  p1: Point;
  p2: Point;
  length: number;
  angle: number; // Em graus, 0° = horizontal direita
}

export interface MaskPath {
  id: string;
  points: Point[];
  type: 'freehand' | 'brush';
}

export interface PointsAnnotation {
  type: 'points';
  points: PointData[];
}

export interface LinesAnnotation {
  type: 'lines';
  lines: LineData[];
}

export interface MasksAnnotation {
  type: 'masks';
  paths: MaskPath[]; // Caminhos individuais (antes da união)
  unified: Polygon | null; // Máscara unificada (após união)
}

export type AnnotationData = PointsAnnotation | LinesAnnotation | MasksAnnotation;

export interface Annotation {
  id: string;
  type: AnnotationType;
  name: string;
  frameId: string;
  visible: boolean;
  isEditing: boolean;
  data: AnnotationData;
}

export interface FrameOfInterestV2 {
  id: string;
  name: string;
  frameNumber: number;
  timestamp: number;
  annotations: Annotation[];
  visible: boolean;
}

// ========== TIPOS ANTIGOS (deprecated) ==========

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

// ========== GLOBAL STATE ==========

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
  framesOfInterest: FrameOfInterestV2[]; // MIGRADO para v2
  selectedFrameId: string | null;
  selectedAnnotationId: string | null; // RENOMEADO de selectedGeometryId
  currentTool: ToolType;
  brushMode: 'add' | 'subtract';
  brushSize: number; // NOVO: tamanho do brush circular
  zoomLevel: number;
}

export interface Measurement {
  id: string;
  geometryId: string;
  type: 'distance' | 'area';
  value: number;
  unit: string;
}
