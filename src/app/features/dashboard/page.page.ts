import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthService } from '../../auth/auth.service';
import { UserDataService } from '../../core/services/firebase/user-data';

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
  providers: [provideCharts(withDefaultRegisterables())],
})
export class PagePage implements OnInit {
  private authService = inject(AuthService);
  private userDataService = inject(UserDataService);

  logout() {
    this.authService.logout();
  }

  nivelAtual = 1;
  xpAtual = 0;
  treinoPorDia: Record<string, string | null> = {
    'Domingo': null,
    'Segunda': null,
    'Terça': null,
    'Quarta': null,
    'Quinta': null,
    'Sexta': null,
    'Sábado': null,
  };
  refeicoes: { nome: string; feita: boolean }[] = [];
  consumoAgua: boolean[] = [false, false, false, false];
  litros = [1, 2, 3, 4];
  xpHistorico: { data: string; ganho: number; bruto: number; modificador: number }[] = [];

 dailyQuests: { id: string; nome: string; done: boolean; level: string; ultimoCheck: string | null }[] = [];
weeklyQuests: { id: string; nome: string; done: boolean; level: string; ultimoCheck: string | null }[] = [];


  mostrarXpTemporario = false;
  xpGanhoTemporario = 0;
  mostrarLevelUp = false;
  diaAtual = '';
  diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  treinos = ['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Descanso'];

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

  ngOnInit() {
    this.atualizarDiaAtual();
    this.carregarDadosDoUsuario();
  }

  atualizarDiaAtual() {
    const hoje = new Date();
    const diaIndex = hoje.getDay();
    this.diaAtual = this.diasSemana[diaIndex];
  }

  async carregarDadosDoUsuario() {
   const dados = await this.userDataService.getUserData();
  if (!dados) return;

  this.nivelAtual = dados['nivel'];
  this.xpAtual = dados['xp'];

  // Refeições
  const refeicoesRaw = dados['meals'] as Record<string, boolean>;
  this.refeicoes = Object.entries(refeicoesRaw || {}).map(([nome, feita]) => ({ nome, feita: Boolean(feita) }));

  // Água
  const hoje = new Date().toISOString().split('T')[0];
  const litrosHoje = (dados['waterIntake'] as Record<string, number>)?.[hoje] || 0;
  this.consumoAgua = this.litros.map((litro) => litro <= litrosHoje);

  // Treinos
  this.treinoPorDia = dados['workouts'] as Record<string, string>;

  // ✅ QUESTS - CORREÇÃO AQUI
  const quests = dados['quests'] as any;
  this.dailyQuests = (quests?.daily || []).map((q: any) => ({
    id: q.id,
    nome: q.descricao,
    done: q.concluida,
    level: q.level,
    ultimoCheck: q.ultimoCheck,
  }));

  this.weeklyQuests = (quests?.weekly || []).map((q: any) => ({
    id: q.id,
    nome: q.descricao,
    done: q.concluida,
    level: q.level,
    ultimoCheck: q.ultimoCheck,
  }));

  // XP Histórico (mock)
  this.xpHistorico = [
    { data: '01/07', ganho: 50, bruto: 55, modificador: -5 },
    { data: '30/06', ganho: 80, bruto: 90, modificador: -10 },
  ];


  console.log('[REFEIÇÕES]', this.refeicoes);
  console.log('[ÁGUA]', litrosHoje);
  console.log('[DAILY QUESTS]', this.dailyQuests);
  console.log('[WEEKLY QUESTS]', this.weeklyQuests);
  console.log('[TREINOS]', this.treinoPorDia);
  }

  get xpParaProximoNivel(): number {
    return Math.floor(100 + this.nivelAtual * 80);
  }

  get progressoXP(): number {
    return Math.min((this.xpAtual / this.xpParaProximoNivel) * 100, 100);
  }

  treinoFeitoNoDia(dia: string) {
    return this.treinoPorDia?.[dia] ?? null;
  }

  marcarTreino(treino: string) {
  const treinoAtual = this.treinoPorDia[this.diaAtual];

  if (treinoAtual === treino) {
    this.treinoPorDia[this.diaAtual] = null;
    this.userDataService.updateUserField(`workouts.${this.diaAtual}`, null);
  } else {
    this.treinoPorDia[this.diaAtual] = treino;
    this.userDataService.updateUserField(`workouts.${this.diaAtual}`, treino);
    this.ganharXP(30);
  }
}

  toggleRefeicao(refeicao: { nome: string; feita: boolean }) {
  refeicao.feita = !refeicao.feita;
  this.ganharXP(refeicao.feita ? 10 : -10);

  this.userDataService.updateUserField(`meals.${refeicao.nome}`, refeicao.feita);
}

  toggleAgua(index: number) {
  this.consumoAgua[index] = !this.consumoAgua[index];

  const litrosConsumidos = this.consumoAgua.filter(v => v).length;
  const hoje = new Date().toISOString().split('T')[0];
  this.userDataService.updateUserField(`waterIntake.${hoje}`, litrosConsumidos);

  this.ganharXP(this.consumoAgua[index] ? 5 : -5);
}
toggleDailyQuest(quest: any) {
  quest.done = !quest.done;
  this.userDataService.toggleQuestConcluida(quest.id, 'daily', quest.done);
  this.ganharXP(quest.done ? 20 : -20);
}

toggleWeeklyQuest(quest: any) {
  quest.done = !quest.done;
  this.userDataService.toggleQuestConcluida(quest.id, 'weekly', quest.done);
  this.ganharXP(quest.done ? 40 : -40);
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
  }

  chartData = {
    labels: ['Força', 'Destreza', 'Inteligência', 'Constituição', 'Carisma', 'Sabedoria'],
    datasets: [
      {
        label: 'Atributos',
        data: [65, 59, 90, 81, 56, 55],
        fill: true,
        backgroundColor: 'rgba(54,162,235,0.2)',
        borderColor: 'rgb(54,162,235)',
        pointBackgroundColor: 'rgb(54,162,235)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(54,162,235)',
      },
    ],
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
            weight: 'bold' as const,
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
          },
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { display: false },
      },
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
            weight: 'bold' as const,
            family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
          },
        },
      },
    },
  };

  private xpTimeout: any = null;
  private levelTimeout: any = null;
}
