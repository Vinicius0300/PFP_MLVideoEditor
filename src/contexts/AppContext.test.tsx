import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
);

describe('AppContext', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.state.videoUrl).toBeNull();
    expect(result.current.state.currentFrame).toBe(0);
    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.state.framesOfInterest).toEqual([]);
    expect(result.current.state.currentTool).toBe('select');
  });

  it('updates current frame', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_FRAME', payload: 10 });
    });

    expect(result.current.state.currentFrame).toBe(10);
  });

  it('toggles play state', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    expect(result.current.state.isPlaying).toBe(false);

    act(() => {
      result.current.dispatch({ type: 'TOGGLE_PLAY' });
    });

    expect(result.current.state.isPlaying).toBe(true);
  });

  it('changes tool', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'SET_TOOL', payload: 'line' });
    });

    expect(result.current.state.currentTool).toBe('line');
  });

  it('adds frame of interest', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const frame = {
      id: 'frame-1',
      name: 'Test Frame',
      frameNumber: 10,
      timestamp: 0.333,
      geometries: [],
      visible: true,
    };

    act(() => {
      result.current.dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frame });
    });

    expect(result.current.state.framesOfInterest).toHaveLength(1);
    expect(result.current.state.framesOfInterest[0]).toEqual(frame);
  });

  it('deletes frame of interest', () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    const frame = {
      id: 'frame-1',
      name: 'Test Frame',
      frameNumber: 10,
      timestamp: 0.333,
      geometries: [],
      visible: true,
    };

    act(() => {
      result.current.dispatch({ type: 'ADD_FRAME_OF_INTEREST', payload: frame });
      result.current.dispatch({ type: 'DELETE_FRAME_OF_INTEREST', payload: 'frame-1' });
    });

    expect(result.current.state.framesOfInterest).toHaveLength(0);
  });
});
