export interface QuestInstance {
id: string;
categoria: 'daily' | 'weekly';
descricao: string;
level: 'fácil' | 'médio' | 'difícil' | 'insano';
vencimento: string;
concluida: boolean;
checkDate: string | null;
tags?: ('Social' | 'Estudo' | 'Fé' | 'Força' | 'Consciência' | 'Padrão')[];
expirado?: boolean;
// NOVOS: vínculo com o template de origem
  templateId?: string;                 // id do template de onde veio
  templateType?: 'fixed' | 'hunting';  // catálogo de origem
  appliedRev?: number;                 // versão do template aplicada ao criar a instância
}
