export type AttrKey =
  | 'forca'
  | 'inteligencia'
  | 'socializacao'
  | 'disciplina'
  | 'consciencia'
  | 'fe';

export interface Attr {
  value: number;      // 0..100 (vamos clAMPar)
  floor: number;      // piso (ex.: 20)
  lastUpdated: string; // ISO date
}

export type Attrs = Record<AttrKey, Attr>;
