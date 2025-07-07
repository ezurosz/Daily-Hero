export interface DailyQuest {
  id: string;
  descricao: string;
  categoria: 'daily' | 'weekly';
  level: 'fácil' | 'médio' | 'difícil' | 'insano';
  fixa: boolean; // 🔁 Indica se essa quest será recriada automaticamente todo dia
  concluida: boolean; 
}
