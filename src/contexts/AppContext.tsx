import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  AppState,
  FrameOfInterestV2,
  Annotation,
  VideoMetadata,
  ToolType,
  PointData,
  LineData,
  MaskPath,
  Polygon,
  PointsAnnotation,
  LinesAnnotation,
  MasksAnnotation
} from '../types';

type AppAction =
  | { type: 'SET_VIDEO'; payload: { url: string; metadata: VideoMetadata } }
  | { type: 'CLEAR_VIDEO' }
  | { type: 'SET_CURRENT_FRAME'; payload: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'ADD_FRAME_OF_INTEREST'; payload: FrameOfInterestV2 }
  | { type: 'UPDATE_FRAME_OF_INTEREST'; payload: { id: string; updates: Partial<FrameOfInterestV2> } }
  | { type: 'DELETE_FRAME_OF_INTEREST'; payload: string }
  | { type: 'ADD_ANNOTATION'; payload: { frameId: string; annotation: Annotation } }
  | { type: 'UPDATE_ANNOTATION'; payload: { frameId: string; annotationId: string; updates: Partial<Annotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: { frameId: string; annotationId: string } }
  | { type: 'TOGGLE_ANNOTATION_EDIT_MODE'; payload: { frameId: string; annotationId: string } }
  | { type: 'ADD_POINT_TO_ANNOTATION'; payload: { frameId: string; annotationId: string; point: PointData } }
  | { type: 'ADD_LINE_TO_ANNOTATION'; payload: { frameId: string; annotationId: string; line: LineData } }
  | { type: 'ADD_MASK_PATH_TO_ANNOTATION'; payload: { frameId: string; annotationId: string; path: MaskPath } }
  | { type: 'REMOVE_POINT_FROM_ANNOTATION'; payload: { frameId: string; annotationId: string; pointId: string } }
  | { type: 'REMOVE_LINE_FROM_ANNOTATION'; payload: { frameId: string; annotationId: string; lineId: string } }
  | { type: 'REMOVE_MASK_PATH_FROM_ANNOTATION'; payload: { frameId: string; annotationId: string; pathId: string } }
  | { type: 'UPDATE_MASK_UNION'; payload: { frameId: string; annotationId: string; unified: Polygon } }
  | { type: 'SELECT_FRAME'; payload: string | null }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'SET_BRUSH_MODE'; payload: 'add' | 'subtract' }
  | { type: 'SET_BRUSH_SIZE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number };

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const initialState: AppState = {
  videoUrl: null,
  videoMetadata: null,
  currentFrame: 0,
  isPlaying: false,
  framesOfInterest: [],
  selectedFrameId: null,
  selectedAnnotationId: null,
  currentTool: 'select',
  brushMode: 'add',
  brushSize: 20,
  zoomLevel: 1,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIDEO':
      return {
        ...state,
        videoUrl: action.payload.url,
        videoMetadata: action.payload.metadata,
        currentFrame: 0,
        framesOfInterest: [],
      };

    case 'CLEAR_VIDEO':
      return {
        ...initialState,
      };

    case 'SET_CURRENT_FRAME':
      return { ...state, currentFrame: action.payload };

    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };

    case 'ADD_FRAME_OF_INTEREST':
      return {
        ...state,
        framesOfInterest: [...state.framesOfInterest, action.payload],
      };

    case 'UPDATE_FRAME_OF_INTEREST':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.id
            ? { ...frame, ...action.payload.updates }
            : frame
        ),
      };

    case 'DELETE_FRAME_OF_INTEREST':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.filter(
          (frame) => frame.id !== action.payload
        ),
        selectedFrameId:
          state.selectedFrameId === action.payload ? null : state.selectedFrameId,
      };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: [...frame.annotations, action.payload.annotation],
              }
            : frame
        ),
      };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) =>
                  ann.id === action.payload.annotationId
                    ? { ...ann, ...action.payload.updates }
                    : ann
                ),
              }
            : frame
        ),
      };

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.filter(
                  (ann) => ann.id !== action.payload.annotationId
                ),
              }
            : frame
        ),
        selectedAnnotationId:
          state.selectedAnnotationId === action.payload.annotationId
            ? null
            : state.selectedAnnotationId,
      };

    case 'TOGGLE_ANNOTATION_EDIT_MODE':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) =>
                  ann.id === action.payload.annotationId
                    ? { ...ann, isEditing: !ann.isEditing }
                    : ann
                ),
              }
            : frame
        ),
      };

    case 'ADD_POINT_TO_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'points') {
                    const pointsData = ann.data as PointsAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...pointsData,
                        points: [...pointsData.points, action.payload.point],
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'ADD_LINE_TO_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'lines') {
                    const linesData = ann.data as LinesAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...linesData,
                        lines: [...linesData.lines, action.payload.line],
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'ADD_MASK_PATH_TO_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'masks') {
                    const masksData = ann.data as MasksAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...masksData,
                        paths: [...masksData.paths, action.payload.path],
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'REMOVE_POINT_FROM_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'points') {
                    const pointsData = ann.data as PointsAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...pointsData,
                        points: pointsData.points.filter((p) => p.id !== action.payload.pointId),
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'REMOVE_LINE_FROM_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'lines') {
                    const linesData = ann.data as LinesAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...linesData,
                        lines: linesData.lines.filter((l) => l.id !== action.payload.lineId),
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'REMOVE_MASK_PATH_FROM_ANNOTATION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'masks') {
                    const masksData = ann.data as MasksAnnotation;
                    return {
                      ...ann,
                      data: {
                        ...masksData,
                        paths: masksData.paths.filter((p) => p.id !== action.payload.pathId),
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'UPDATE_MASK_UNION':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                annotations: frame.annotations.map((ann) => {
                  if (ann.id === action.payload.annotationId && ann.type === 'masks') {
                    return {
                      ...ann,
                      data: {
                        ...ann.data,
                        unified: action.payload.unified,
                      },
                    };
                  }
                  return ann;
                }),
              }
            : frame
        ),
      };

    case 'SELECT_FRAME':
      return { ...state, selectedFrameId: action.payload };

    case 'SELECT_ANNOTATION':
      return { ...state, selectedAnnotationId: action.payload };

    case 'SET_TOOL':
      return { ...state, currentTool: action.payload };

    case 'SET_BRUSH_MODE':
      return { ...state, brushMode: action.payload };

    case 'SET_BRUSH_SIZE':
      return { ...state, brushSize: action.payload };

    case 'SET_ZOOM':
      return { ...state, zoomLevel: action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
