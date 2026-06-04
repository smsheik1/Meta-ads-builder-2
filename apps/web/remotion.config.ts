import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((currentConfiguration) => ({
  ...currentConfiguration,
  resolve: {
    ...currentConfiguration.resolve,
    alias: {
      ...(currentConfiguration.resolve?.alias ?? {}),
      '@': path.resolve(process.cwd()),
    },
  },
}));
