import { FixedQuestTemplate } from './fixed-quest-template.model';

export interface Usuario {
  nivel: number;
  xp: number;
  questTemplates: FixedQuestTemplate[];
  workoutList: string[];
  xpHistory: {
    lastEntry: string | null;
  };
}
