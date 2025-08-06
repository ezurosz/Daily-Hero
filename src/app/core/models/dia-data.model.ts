import { Quest } from './quest.model';
import { Meal } from './meal.model';
import { Exercicio } from './treino.model'; // já existente

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
  dailyHuntingQuests: Quest[];
  weeklyHuntingQuests: Quest[];
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
}
