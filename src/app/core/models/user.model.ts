import { DailyQuest } from './daily-quest.model';

export interface Usuario {
  nivel: number;
  xp: number;
  questTemplates: DailyQuest[];
  workoutList: string[];
  xpHistory: {
    lastEntry: string | null;
  };
}
