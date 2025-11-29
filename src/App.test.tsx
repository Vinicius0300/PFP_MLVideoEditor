import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/VideoML Editor/i)).toBeInTheDocument();
  });

  it('shows upload component when no video is loaded', () => {
    render(<App />);
    expect(screen.getByText(/Upload de Vídeo/i)).toBeInTheDocument();
  });
});
