export interface HuntingTemplate {
id: string;
categoria: 'daily' | 'weekly';
descricao: string;
level: 'fácil' | 'médio' | 'difícil' | 'insano';
vencimento: string;
concluida: boolean;
checkDate: string | null;
tags?: ('Social' | 'Estudo' | 'Fé' | 'Força' | 'Consciência' | 'Padrão')[];
expirado?: boolean;
}
