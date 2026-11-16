import type { CSSProperties } from 'react';
import { border, CARD_BG, MUTED_OPACITY } from '@/shared/ui/payload/theme';

export const card: CSSProperties = {
  minWidth: 0,
  border,
  borderRadius: 6,
  background: CARD_BG,
  padding: 20,
  boxSizing: 'border-box',
};

export const muted: CSSProperties = {
  fontSize: 13,
  opacity: MUTED_OPACITY,
};

export const control: CSSProperties = {
  height: 36,
  padding: '0 12px',
  border,
  borderRadius: 4,
  background: 'transparent',
  color: 'inherit',
  colorScheme: 'light dark',
  fontSize: 14,
  fontFamily: 'inherit',
};
