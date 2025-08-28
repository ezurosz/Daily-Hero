import { FixedQuestTemplate } from './fixed-quest-template.model';
import { WorkoutPlan } from './treino.model';
import { Attrs } from './atributos.model';

export interface Usuario {
  nivel: number;
  xp: number;
  questTemplates: FixedQuestTemplate[];
  workoutPlan?: WorkoutPlan[];
  xpHistory: {
    lastEntry: string | null;
  };
  attributes?: Attrs;

}
