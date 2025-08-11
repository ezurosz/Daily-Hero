export interface FixedQuestTemplate{
  id: string;
categoria: 'daily' | 'weekly';
descricao: string;
level: 'fácil' | 'médio' | 'difícil' | 'insano';
tags?: ('Social' | 'Estudo' | 'Fé' | 'Força' | 'Consciência' | 'Padrão')[];
fixa: boolean;

// NOVO: versão do template (contador que incrementa a cada edição real)
  rev?: number; // tratar como 1 quando undefined

}
