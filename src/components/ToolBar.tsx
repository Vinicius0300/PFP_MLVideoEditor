import {
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  PanTool,
  FiberManualRecord,
  Timeline,
  Gesture,
  Brush,
  SwapCalls,
} from '@mui/icons-material';
import { useApp } from '../contexts/AppContext';
import type { ToolType } from '../types';

export function ToolBar() {
  const { state, dispatch } = useApp();

  const handleToolChange = (_: React.MouseEvent<HTMLElement>, newTool: ToolType | null) => {
    if (newTool !== null) {
      dispatch({ type: 'SET_TOOL', payload: newTool });
    }
  };

  const handleBrushModeToggle = () => {
    dispatch({
      type: 'SET_BRUSH_MODE',
      payload: state.brushMode === 'add' ? 'subtract' : 'add',
    });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Ferramentas</Typography>

        <ToggleButtonGroup
          value={state.currentTool}
          exclusive
          onChange={handleToolChange}
          orientation="vertical"
          fullWidth
        >
          <ToggleButton value="select">
            <Tooltip title="Selecionar">
              <PanTool />
            </Tooltip>
          </ToggleButton>

          <ToggleButton value="point">
            <Tooltip title="Ponto">
              <FiberManualRecord />
            </Tooltip>
          </ToggleButton>

          <ToggleButton value="line">
            <Tooltip title="Linha">
              <Timeline />
            </Tooltip>
          </ToggleButton>

          <ToggleButton value="freehand">
            <Tooltip title="Seleção Livre">
              <Gesture />
            </Tooltip>
          </ToggleButton>

          <ToggleButton value="brush">
            <Tooltip title="Pincel">
              <Brush />
            </Tooltip>
          </ToggleButton>

          <ToggleButton value="perpendicular">
            <Tooltip title="Linha Perpendicular">
              <SwapCalls />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {state.currentTool === 'brush' && (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="body2">Modo do Pincel</Typography>
              <ToggleButtonGroup
                value={state.brushMode}
                exclusive
                onChange={handleBrushModeToggle}
                fullWidth
              >
                <ToggleButton value="add" sx={{ bgcolor: state.brushMode === 'add' ? 'success.light' : undefined }}>
                  Adicionar
                </ToggleButton>
                <ToggleButton value="subtract" sx={{ bgcolor: state.brushMode === 'subtract' ? 'error.light' : undefined }}>
                  Subtrair
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
}
