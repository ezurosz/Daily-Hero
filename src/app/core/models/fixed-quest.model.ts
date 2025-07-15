export interface FixedQuest{
  id: string;
categoria: 'daily' | 'weekly';
descricao: string;
level: 'fácil' | 'médio' | 'difícil' | 'insano';
tags?: ('Social' | 'Estudo' | 'Fé')[];
fixa: boolean;

}
