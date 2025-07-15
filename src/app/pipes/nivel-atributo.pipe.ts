import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'nivelAtributo', standalone: true })
export class NivelAtributoPipe implements PipeTransform {
  transform(valor: number): string {
    if (valor >= 90) return '🏆 Excelente';
    if (valor >= 75) return '💪 Forte';
    if (valor >= 60) return '🙂 Estável';
    if (valor >= 40) return '⚠️ Frágil';
    return '❌ Crítico';
  }
}
