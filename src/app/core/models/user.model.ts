import { Quest } from './quest.model';
import { XpHistorico } from './xp-histórico.model';

export interface UsuarioDB {
  nivel: number;
  xp: number;
  quests: {
    daily: Quest[];
    weekly: Quest[];
  };
  waterIntake: Record<string, number>; // Ex: { '2025-07-01': 3 }
  meals: Record<string, boolean>;      // Ex: { 'Café da Manhã': true }
  workouts: Record<string, string>;    // Ex: { '2025-07-01': 'Treino A' }
  workoutList: string[];               // Lista de treinos disponíveis
  xpHistory: {
    lastEntry: string | null;          // Ex: '2025-07-01'
  };
}

