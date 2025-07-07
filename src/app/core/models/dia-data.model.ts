import { Quest } from './quest.model';

export interface DiaData {
  nivelNoDia: number;
  xpGanho: number;
  meals: Record<string, boolean>;
  waterIntake: number;
  workout: null;
  huntingQuests: Quest[];
  dailyQuests: Quest[];
}

