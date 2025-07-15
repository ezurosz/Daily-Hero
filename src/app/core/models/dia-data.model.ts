import { Quest } from './quest.model';
import { Meal } from './meal.model';

export interface DiaData {
  nivelNoDia: number;
  xpGanho: number;
  meals: Meal[];
  waterIntake: number;
  workout: null;
  dailyHuntingQuests: Quest[];  // Huntings diárias
  weeklyHuntingQuests: Quest[]; // Huntings semanais
  dailyQuests: Quest[];
  weeklyQuests: Quest[];
}

