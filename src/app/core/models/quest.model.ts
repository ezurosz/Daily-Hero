// models/quest.model.ts

export type QuestLevel = 'fácil' | 'médio' | 'difícil' | 'insano';

export interface Quest {
  id: string;
  descricao: string;
  concluida: boolean;
  categoria: 'daily' | 'weekly';
  level: QuestLevel;
  ultimoCheck: string | null; // formato: 'YYYY-MM-DD'
}
