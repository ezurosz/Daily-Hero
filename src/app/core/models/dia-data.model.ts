import { QuestInstance } from './quest-instance.model';
import { Meal } from './meal.model';
import { Exercicio } from './treino.model'; // já existente
import { HuntingTemplate } from './hunting-template';

export interface DiaData {
  nivelNoDia: number;
  xpGanho: number;
  meals: Meal[];
  waterIntake: number;
  workout: null; // Mantém como campo legado se necessário
  treinos?: {
    [nomeDoTreino: string]: {
      nome: string;
      exercicios: Exercicio[];
    };
  };
  huntingQuests: HuntingTemplate[];
  fixedQuests: QuestInstance[];
}
