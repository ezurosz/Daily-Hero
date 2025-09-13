export type CodexBlockId = string; // livre (usaremos UUID)

export interface CodexBlock {
  id: CodexBlockId;
  title: string; // ex.: "Dicionário", "Estudos linguísticos", "Frases & Citações"

  // ISO-8601 UTC (ex.: "2025-08-28T23:13:26.424Z")
  createdAt: string;
  updatedAt: string;

  // Conteúdo principal do bloco (nota única com Quill)
  contentHtml?: string;          // HTML salvo automaticamente
  contentUpdatedAt?: string;     // ISO string da última alteração
}

export interface CodexEntry {
  id: string;
  text: string; // legado (markdown ou HTML)
  createdAt: string;
  updatedAt: string;
}

export interface ReflexaoEntry {
  id: string;
  text: string; // livre
  createdAt: string;
  updatedAt: string;
  uid?: string; // útil para collectionGroup
  dateKey?: string; // "YYYY-MM-DD" (facilita filtros)
}

export interface CodexFlags {
  inteligencia?: boolean; // pontuou hoje via blocos livres
  consciencia?: boolean; // pontuou hoje via reflexões
}
