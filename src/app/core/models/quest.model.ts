export interface Quest {
  id: string;
  categoria: 'daily' | 'weekly';     // antes estava como 'categoria' nos templates
  descricao: string;                // ✅ adicionado
  level: 'fácil' | 'médio' | 'difícil' | 'insano'; // ✅ adicionado
  vencimento: string;
  concluida: boolean;
  checkDate: string | null;
}
