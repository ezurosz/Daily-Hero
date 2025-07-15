import { FixedQuest } from './fixed-quest.model';

export interface Usuario {
  nivel: number;
  xp: number;
  questTemplates: FixedQuest[];
  workoutList: string[];
  xpHistory: {
    lastEntry: string | null;
  };
}
