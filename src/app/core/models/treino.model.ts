// models/treino.model.ts

export interface Serie {
  reps?: number | null;
  carga?: number | null;
}

export interface Exercicio {
  nome: string;
  descanso?: number; // segundos
  series: Serie[];
  observacoes?: string;
}

export interface Treino {
  nome: string; // Ex: "Treino A"
  exercicios: Exercicio[];
}
