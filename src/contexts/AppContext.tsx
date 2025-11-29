import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { AppState, FrameOfInterest, Geometry, VideoMetadata, ToolType } from '../types';

type AppAction =
  | { type: 'SET_VIDEO'; payload: { url: string; metadata: VideoMetadata } }
  | { type: 'CLEAR_VIDEO' }
  | { type: 'SET_CURRENT_FRAME'; payload: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'ADD_FRAME_OF_INTEREST'; payload: FrameOfInterest }
  | { type: 'UPDATE_FRAME_OF_INTEREST'; payload: { id: string; updates: Partial<FrameOfInterest> } }
  | { type: 'DELETE_FRAME_OF_INTEREST'; payload: string }
  | { type: 'ADD_GEOMETRY'; payload: { frameId: string; geometry: Geometry } }
  | { type: 'UPDATE_GEOMETRY'; payload: { frameId: string; geometryId: string; updates: Partial<Geometry> } }
  | { type: 'DELETE_GEOMETRY'; payload: { frameId: string; geometryId: string } }
  | { type: 'SELECT_FRAME'; payload: string | null }
  | { type: 'SELECT_GEOMETRY'; payload: string | null }
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'SET_BRUSH_MODE'; payload: 'add' | 'subtract' }
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
  selectedGeometryId: null,
  currentTool: 'select',
  brushMode: 'add',
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

    case 'ADD_GEOMETRY':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                geometries: [...frame.geometries, action.payload.geometry],
              }
            : frame
        ),
      };

    case 'UPDATE_GEOMETRY':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                geometries: frame.geometries.map((geo) =>
                  geo.id === action.payload.geometryId
                    ? { ...geo, ...action.payload.updates }
                    : geo
                ),
              }
            : frame
        ),
      };

    case 'DELETE_GEOMETRY':
      return {
        ...state,
        framesOfInterest: state.framesOfInterest.map((frame) =>
          frame.id === action.payload.frameId
            ? {
                ...frame,
                geometries: frame.geometries.filter(
                  (geo) => geo.id !== action.payload.geometryId
                ),
              }
            : frame
        ),
        selectedGeometryId:
          state.selectedGeometryId === action.payload.geometryId
            ? null
            : state.selectedGeometryId,
      };

    case 'SELECT_FRAME':
      return { ...state, selectedFrameId: action.payload };

    case 'SELECT_GEOMETRY':
      return { ...state, selectedGeometryId: action.payload };

    case 'SET_TOOL':
      return { ...state, currentTool: action.payload };

    case 'SET_BRUSH_MODE':
      return { ...state, brushMode: action.payload };

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
