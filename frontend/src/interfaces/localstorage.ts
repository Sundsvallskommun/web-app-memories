import { ColorSchemeMode } from '@sk-web-gui/react';

export type TableProperty = string;

export interface LocalStorage {
  colorScheme: ColorSchemeMode;
  setColorScheme: (color: ColorSchemeMode) => void;
}
