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
  Circle,
  Timeline,
  Gesture,
  Brush,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import type { FrameOfInterest, Geometry } from '../types';

export function FramesSidebar() {
  const { state, dispatch } = useApp();
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{ type: 'frame' | 'geometry'; id: string; frameId?: string } | null>(null);
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

  const handleGeometrySelect = (geometryId: string) => {
    dispatch({ type: 'SELECT_GEOMETRY', payload: geometryId });
  };

  const handleToggleFrameVisibility = (frame: FrameOfInterest, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_FRAME_OF_INTEREST',
      payload: { id: frame.id, updates: { visible: !frame.visible } },
    });
  };

  const handleToggleGeometryVisibility = (frameId: string, geometry: Geometry, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({
      type: 'UPDATE_GEOMETRY',
      payload: {
        frameId,
        geometryId: geometry.id,
        updates: { visible: !geometry.visible },
      },
    });
  };

  const handleDeleteFrame = (frameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_FRAME_OF_INTEREST', payload: frameId });
  };

  const handleDeleteGeometry = (frameId: string, geometryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_GEOMETRY', payload: { frameId, geometryId } });
  };

  const handleEditFrame = (frame: FrameOfInterest, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ type: 'frame', id: frame.id });
    setNewName(frame.name);
  };

  const handleEditGeometry = (frameId: string, geometry: Geometry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem({ type: 'geometry', id: geometry.id, frameId });
    setNewName(geometry.name);
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
        type: 'UPDATE_GEOMETRY',
        payload: {
          frameId: editingItem.frameId,
          geometryId: editingItem.id,
          updates: { name: newName },
        },
      });
    }

    setEditingItem(null);
    setNewName('');
  };

  const getGeometryIcon = (type: string) => {
    switch (type) {
      case 'point':
        return <Circle fontSize="small" />;
      case 'line':
        return <Timeline fontSize="small" />;
      case 'freehand':
        return <Gesture fontSize="small" />;
      case 'brush':
        return <Brush fontSize="small" />;
      default:
        return <Circle fontSize="small" />;
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
                {frame.geometries.map((geometry) => (
                  <ListItem
                    key={geometry.id}
                    sx={{
                      pl: 4,
                      bgcolor: state.selectedGeometryId === geometry.id ? 'action.selected' : 'transparent',
                    }}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleGeometryVisibility(frame.id, geometry, e)}
                        >
                          {geometry.visible ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleEditGeometry(frame.id, geometry, e)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteGeometry(frame.id, geometry.id, e)}
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemButton onClick={() => handleGeometrySelect(geometry.id)}>
                      <ListItemIcon>{getGeometryIcon(geometry.type)}</ListItemIcon>
                      <ListItemText
                        primary={geometry.name}
                        secondary={geometry.type}
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
          Renomear {editingItem?.type === 'frame' ? 'Frame' : 'Geometria'}
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
