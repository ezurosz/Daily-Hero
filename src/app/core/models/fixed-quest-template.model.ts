export interface FixedQuestTemplate{
  id: string;
categoria: 'daily' | 'weekly';
descricao: string;
level: 'fácil' | 'médio' | 'difícil' | 'insano';
tags?: ('Social' | 'Estudo' | 'Fé' | 'Força' | 'Consciência' | 'Padrão')[];
fixa: boolean;

}
