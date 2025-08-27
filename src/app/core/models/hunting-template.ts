// hunting-template.model.ts  (CATÁLOGO HUNTINGS)
// Você disse que HuntingTemplate = "igual ao QuestInstance" (mantém campos de estado),

import { QuestInstance } from "./quest-instance.model";

// só vamos adicionar 'rev' para controle de versão do template.
export interface HuntingTemplate extends QuestInstance {
  rev?: number; // tratar como 1 quando undefined
  instanciar: boolean;
}
