import type { AdFormatModule } from '../formatTypes';
import { VisualizerEditTray } from './VisualizerEditTray';

export const visualizerFormat: AdFormatModule = {
  id: 'visualizer',
  label: 'Visualizer ad',
  description: 'Audio-reactive ad creative with headline, brand, waveform, and captions.',
  status: 'active',
  EditTray: VisualizerEditTray,
};
