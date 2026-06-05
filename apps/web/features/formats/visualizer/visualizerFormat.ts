import type { AdFormatModule } from '../formatTypes';
import { VisualizerEditTray } from './VisualizerEditTray';

export const visualizerFormat: AdFormatModule = {
  id: 'visualizer',
  label: 'Visualizer ad',
  EditTray: VisualizerEditTray,
};
