import { Component, OnInit, inject } from '@angular/core';
import { Refeicao } from '../../core/models/meal.model';
import { ConsumoAgua } from '../../core/models/consumo-agua.model';
import { CommonModule } from '@angular/common';
import { XpService, Categoria } from '../../core/services/xp.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Auth, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-page',
  standalone: true,
  templateUrl: './page.page.html',
  styleUrls: ['./page.page.scss'],
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatCardModule,
    MatListModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatExpansionModule,
    BaseChartDirective,
    MatTooltipModule,
  ],
  providers: [
    provideCharts(withDefaultRegisterables())
  ]
})
export class PagePage implements OnInit {
 private authService = inject(AuthService);

logout() {
  this.authService.logout();
}

  refeicoes: Refeicao[] = [
    { id: '1', nome: 'Café da manhã', feita: false },
    { id: '2', nome: 'Almoço', feita: true },
    { id: '3', nome: 'Jantar', feita: false },
  ];

  consumoAgua: boolean[] = [false, false, false, false];
  litros = [1, 2, 3, 4];

  diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  treinos = ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Descanso'];

  treinoPorDia: Record<string, string | null> = {
    'Domingo': null,
    'Segunda': null,
    'Terça': null,
    'Quarta': null,
    'Quinta': null,
    'Sexta': null,
    'Sábado': null,
  };

  diaAtual!: string;

  xpHistorico: { data: string; ganho: number; bruto: number; modificador: number }[] = [
    { data: '01/07', ganho: 45, bruto: 50, modificador: -5 },
    { data: '30/06', ganho: 90, bruto: 100, modificador: -10 },
    { data: '29/06', ganho: 75, bruto: 75, modificador: 0 },
    { data: '28/06', ganho: 105, bruto: 100, modificador: +5 },
  ];

  badges = [
    { title: 'Somnia', subtitle: 'Scout' },
    { title: 'Somnia', subtitle: 'Raider' },
    { title: 'Somnia', subtitle: 'Warlord' },
    { title: 'Somnia', subtitle: 'King' },
    { title: 'Somnia', subtitle: 'Rookie' },
    { title: 'Somnia', subtitle: 'Grinder' },
    { title: 'Somnia', subtitle: 'Explorer' },
    { title: 'Somnia', subtitle: 'Overlord' },
    { title: 'Somnia', subtitle: 'Seeker' },
    { title: 'Somnia', subtitle: 'Collector' },
    { title: 'Somnia', subtitle: 'Degen' },
    { title: 'Somnia', subtitle: 'Whale' },
  ];

  nivelAtual = 1;
  xpAtual = 0;

  xpTimeout: any = null;
  levelTimeout: any = null;

  mostrarXpTemporario = false;
  xpGanhoTemporario = 0;
  mostrarLevelUp = false;

  get xpParaProximoNivel(): number {
    return Math.floor(100 + this.nivelAtual * 80);
  }

  get progressoXP(): number {
    return Math.min((this.xpAtual / this.xpParaProximoNivel) * 100, 100);
  }

  ngOnInit() {
    this.atualizarDiaAtual();
    this.calcularXPInicial();
  }

  atualizarDiaAtual() {
    const hoje = new Date();
    const diaIndex = hoje.getDay();
    this.diaAtual = this.diasSemana[diaIndex];
  }

  marcarTreino(treino: string) {
    const treinoAtual = this.treinoPorDia[this.diaAtual];

    if (treinoAtual === treino) {
      this.treinoPorDia[this.diaAtual] = null;
    } else {
      this.treinoPorDia[this.diaAtual] = treino;
      this.ganharXP(30);
    }
  }

  treinoFeitoNoDia(dia: string) {
    return this.treinoPorDia[dia];
  }

  toggleRefeicao(refeicao: Refeicao) {
    refeicao.feita = !refeicao.feita;
    this.ganharXP(refeicao.feita ? 10 : -10);
  }

  toggleAgua(index: number) {
    this.consumoAgua[index] = !this.consumoAgua[index];
    this.ganharXP(this.consumoAgua[index] ? 5 : -5);
  }

  calcularXPInicial() {
    let xpTotal = this.xpHistorico.reduce((soma, entrada) => soma + entrada.ganho, 0);

    while (xpTotal >= this.xpParaProximoNivel) {
      xpTotal -= this.xpParaProximoNivel;
      this.nivelAtual++;
    }

    this.xpAtual = xpTotal;
  }

  ganharXP(quantidade: number) {
    const nivelAntes = this.nivelAtual;
    this.xpAtual += quantidade;

    if (quantidade > 0) {
      clearTimeout(this.xpTimeout);
      this.mostrarXpTemporario = true;
      this.xpGanhoTemporario = quantidade;

      this.xpTimeout = setTimeout(() => {
        this.mostrarXpTemporario = false;
      }, 2000);
    }

    while (this.xpAtual >= this.xpParaProximoNivel) {
      this.xpAtual -= this.xpParaProximoNivel;
      this.nivelAtual++;
    }

    if (this.nivelAtual > nivelAntes) {
      clearTimeout(this.levelTimeout);
      this.mostrarLevelUp = true;

      this.levelTimeout = setTimeout(() => {
        this.mostrarLevelUp = false;
      }, 3000);
    }

    console.log('[XP] +', quantidade, '| Atual:', this.xpAtual, '| Nível:', this.nivelAtual);
  }

  chartData = {
    labels: ['Força', 'Destreza', 'Inteligência', 'Constituição', 'Carisma', 'Sabedoria'],
    datasets: [{
      label: 'Atributos',
      data: [65, 59, 90, 81, 56, 55],
      fill: true,
      backgroundColor: 'rgba(54,162,235,0.2)',
      borderColor: 'rgb(54,162,235)',
      pointBackgroundColor: 'rgb(54,162,235)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(54,162,235)'
    }]
  };

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2,
    scales: {
      r: {
        angleLines: { display: true, color: 'rgba(255, 255, 255, 0.3)' },
        grid: { color: 'rgba(255, 255, 255, 0.15)' },
        pointLabels: {
          color: '#ffffff',
          font: {
            size: 14,
            weight: 'bold' as 'bold',
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
          }
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { display: false }
      }
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#ffffff',
          boxWidth: 0,
          usePointStyle: false,
          font: {
            size: 14,
            weight: 'bold' as 'bold',
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
          }
        }
      }
    }
  };
}
