import { Injectable } from '@angular/core';

export type Categoria = 'agua' | 'refeicao' | 'facil' | 'medio' | 'dificil' | 'insano';

@Injectable({
  providedIn: 'root',
})
export class XpService {
  private readonly XP_BASE: Record<Categoria, number> = {
    agua: 10,
    refeicao: 15,
    facil: 40,
    medio: 60,
    dificil: 90,
    insano: 130,
  };

  calcularXPfinal(categoria: Categoria, level: number): number {
    if (level < 1) {
      throw new Error('Level deve ser 1 ou maior');
    }

    const xpBase = this.XP_BASE[categoria];
    const multiplicador = 1 + 0.15 * Math.sqrt(level);
    const xpFinal = xpBase * multiplicador;
    return Math.round(xpFinal * 100) / 100;
  }
}
