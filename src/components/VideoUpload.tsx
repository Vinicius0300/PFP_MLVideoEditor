import { useRef } from 'react';
import { Button, Typography, Paper } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import type { VideoMetadata } from '../types';

export function VideoUpload() {
  const { dispatch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione um arquivo de vídeo válido (MP4 ou WebM).\n\nNota: AVI não é suportado pelos navegadores web.');
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');

    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        name: file.name,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        frameRate: 30,
        totalFrames: Math.floor(video.duration * 30),
      };

      dispatch({
        type: 'SET_VIDEO',
        payload: { url, metadata },
      });
    };

    video.src = url;
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: 'background.default',
        border: '2px dashed',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Upload de Vídeo
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Selecione um arquivo de vídeo para análise (MP4 ou WebM)
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Nota: Formato AVI não é suportado pelos navegadores web
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={handleClick}
        startIcon={<CloudUpload />}
      >
        Selecionar Vídeo
      </Button>
    </Paper>
  );
}
