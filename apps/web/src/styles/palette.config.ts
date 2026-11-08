export const PALETTES = ['moss', 'tide', 'clay', 'graphite', 'plum'] as const;

export type PaletteName = (typeof PALETTES)[number];

export const ACTIVE_PALETTE: PaletteName = 'moss';
