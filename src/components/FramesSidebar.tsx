import React, { useState } from 'react';
import {
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Collapse,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
  Delete,
  Edit,
  ImageOutlined,
  Place,
  Timeline,
  BrushOutlined,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import type { FrameOfInterestV2, Annotation } from '../types';

export function FramesSidebar() {
  const { state, dispatch } = useApp();
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ type: 'frame' | 'annotation'; id: string; frameId?: string } | null>(null);
  const [newName, setNewName] = useState('');

  const toggleFrame = (frameId: string) => {
    const newExpanded = new Set(expandedFrames);
    if (newExpanded.has(frameId)) {
      newExpanded.delete(frameId);
    } else {
      newExpanded.add(frameId);
    }
    setExpandedFrames(newExpanded);
  };

  const handleFrameSelect = (frameId: string, frameNumber: number) => {
    dispatch({ type: 'SELECT_FRAME', payload: frameId });
    dispatch({ type: 'SET_CURRENT_FRAME', payload: frameNumber });
  };

  const handleAnnotationSelect = (annotationId: string) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: annotationId });
  };

  const handleToggleFrameVisibility = (frame: FrameOfInterestV2, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_FRAME_OF_INTEREST',
      payload: { id: frame.id, updates: { visible: !frame.visible } },
    });
  };

  const handleToggleAnnotationVisibility = (frameId: string, annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_ANNOTATION',
      payload: {
        frameId,
        annotationId: annotation.id,
        updates: { visible: !annotation.visible },
      },
    });
  };

  const handleDeleteFrame = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_FRAME_OF_INTEREST', payload: frameId });
  };

  const handleDeleteAnnotation = (frameId: string, annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_ANNOTATION', payload: { frameId, annotationId } });
  };

  const handleEditFrame = (frame: FrameOfInterestV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ type: 'frame', id: frame.id });
    setNewName(frame.name);
  };

  const handleEditAnnotation = (frameId: string, annotation: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ type: 'annotation', id: annotation.id, frameId });
    setNewName(annotation.name);
  };

  const handleToggleEditMode = (frameId: string, annotationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'TOGGLE_ANNOTATION_EDIT_MODE',
      payload: { frameId, annotationId },
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (editingItem.type === 'frame') {
      dispatch({
        type: 'UPDATE_FRAME_OF_INTEREST',
        payload: { id: editingItem.id, updates: { name: newName } },
      });
    } else if (editingItem.frameId) {
      dispatch({
        type: 'UPDATE_ANNOTATION',
        payload: {
          frameId: editingItem.frameId,
          annotationId: editingItem.id,
          updates: { name: newName },
        },
      });
    }

    setEditingItem(null);
    setNewName('');
  };

  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'points':
        return <Place fontSize="small" />;
      case 'lines':
        return <Timeline fontSize="small" />;
      case 'masks':
        return <BrushOutlined fontSize="small" />;
      default:
        return <Place fontSize="small" />;
    }
  };

  if (state.framesOfInterest.length === 0) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Frames de Interesse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Nenhum frame salvo ainda. Use o botão de bookmark no player para salvar frames.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Frames de Interesse ({state.framesOfInterest.length})
      </Typography>

      <List dense>
        {state.framesOfInterest.map((frame) => (
          <React.Fragment key={frame.id}>
            <ListItem
              disablePadding
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={(e) => handleToggleFrameVisibility(frame, e)}
                  >
                    {frame.visible ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                  <IconButton size="small" onClick={(e) => handleEditFrame(frame, e)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={(e) => handleDeleteFrame(frame.id, e)}>
                    <Delete />
                  </IconButton>
                  <IconButton size="small" onClick={() => toggleFrame(frame.id)}>
                    {expandedFrames.has(frame.id) ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Stack>
              }
              sx={{
                bgcolor: state.selectedFrameId === frame.id ? 'action.selected' : 'transparent',
              }}
            >
              <ListItemButton onClick={() => handleFrameSelect(frame.id, frame.frameNumber)}>
                <ListItemIcon>
                  <ImageOutlined />
                </ListItemIcon>
                <ListItemText
                  primary={frame.name}
                  secondary={`Frame ${frame.frameNumber}`}
                />
              </ListItemButton>
            </ListItem>

            <Collapse in={expandedFrames.has(frame.id)} timeout="auto" unmountOnExit>
              <List component="div" disablePadding dense>
                {frame.annotations.map((annotation) => (
                  <ListItem
                    key={annotation.id}
                    sx={{
                      pl: 4,
                      bgcolor: state.selectedAnnotationId === annotation.id ? 'action.selected' : 'transparent',
                    }}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleAnnotationVisibility(frame.id, annotation, e)}
                        >
                          {annotation.visible ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleEditAnnotation(frame.id, annotation, e)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleEditMode(frame.id, annotation.id, e)}
                          color={annotation.isEditing ? 'primary' : 'default'}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteAnnotation(frame.id, annotation.id, e)}
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemButton onClick={() => handleAnnotationSelect(annotation.id)}>
                      <ListItemIcon>{getAnnotationIcon(annotation.type)}</ListItemIcon>
                      <ListItemText
                        primary={annotation.name}
                        secondary={`${annotation.type}${annotation.isEditing ? ' (editando)' : ''}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </List>

      <Dialog open={editingItem !== null} onClose={() => setEditingItem(null)}>
        <DialogTitle>
          Renomear {editingItem?.type === 'frame' ? 'Frame' : 'Marcação'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Novo nome"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
