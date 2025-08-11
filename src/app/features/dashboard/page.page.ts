import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AuthService } from '../../auth/auth.service';
import { UserDataService } from '../../core/services/firebase/user-data';
import { Meal } from '../../core/models/meal.model';
import { QuestInstance } from '../../core/models/quest-instance.model';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { getDoc } from 'firebase/firestore';




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
    MatChipsModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatIconModule
  ],
  providers: [provideCharts(withDefaultRegisterables())],
})
export class PagePage implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private userDataService = inject(UserDataService);
  private snackBar = inject(MatSnackBar);

  logout() {
    this.authService.logout();
  }
  isMobile = false;
  nivelAtual = 1;
  xpAtual = 0;
  diaAtual = '';
  diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  treinoPorDia: Record<string, string | null> = {
    'Domingo': null,
    'Segunda': null,
    'Terça': null,
    'Quarta': null,
    'Quinta': null,
    'Sexta': null,
    'Sábado': null,
  };

  refeicoes: Meal[] = [];
  consumoAgua: boolean[] = [false, false, false, false];
  litros = [1, 2, 3, 4];
  treinos: string[] = [];

  dailyHuntings: QuestInstance[] = [];
  weeklyHuntings: QuestInstance[] = [];
  dailyQuests: QuestInstance[] = [];
  weeklyQuests: QuestInstance[] = [];

  mostrarXpTemporario = false;
  xpGanhoTemporario = 0;
  mostrarLevelUp = false;

  private userSub?: Subscription;

  xpHistorico: { data: string; ganho: number; bruto: number; modificador: number }[] = [
    { data: '01/07', ganho: 50, bruto: 55, modificador: -5 },
    { data: '30/06', ganho: 80, bruto: 90, modificador: -10 },
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

  async ngOnInit() {
  this.atualizarDiaAtual(); // sempre pode vir primeiro, é síncrono
  this.isMobile = window.innerWidth <= 768;

  // Etapa 1: Garante que o dia exista (único que precisa ser feito antes dos outros)
  await this.userDataService.criarDiaSeNaoExistir();

  // Etapa 2: Executa 3 tarefas em paralelo (não dependem umas das outras)
  await Promise.all([
    this.carregarTreinosDaSemana(),
    this.userDataService.instanciarFixedQuests(),
    /* this.userDataService.carregarFixedQuests(), */
    this.userDataService.instanciarHuntingQuests(),
  ]);

  // Etapa 3: Carrega os dados gerais do usuário (refeições, xp, etc)
  await this.carregarDadosDoUsuario();

  await this.carregarQuestsParaExibicao();

   // 🔁 Verifica quests expiradas a cada 90 segundos
   setInterval(() => {
    this.dailyQuests = this.userDataService.verificarExpiradas(this.dailyQuests);
    this.weeklyQuests = this.userDataService.verificarExpiradas(this.weeklyQuests);
    this.dailyHuntings = this.userDataService.verificarExpiradas(this.dailyHuntings);
    this.weeklyHuntings = this.userDataService.verificarExpiradas(this.weeklyHuntings);
  }, 60000); // a cada 60 segundos
}

  ngOnDestroy(): void {
    // aqui você cancela tudo que precisa ser limpo
    this.userSub?.unsubscribe();
  }

  atualizarDiaAtual() {
    const hoje = new Date();
    const diaIndex = hoje.getDay();
    this.diaAtual = this.diasSemana[diaIndex];
  }

  async carregarDadosDoUsuario() {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  console.log('[📅] Carregando dados do dia:', hoje);

  const dados = await this.userDataService.getDiaData(hoje);
  if (!dados) return;

  //Level e Xp vindo da coleção principal do usuário
  const userMainData = await this.userDataService.getUserMainData();
  if (userMainData) {
    console.log(userMainData)
    this.nivelAtual = userMainData.nivel;
    this.xpAtual = userMainData.xp;
  }

  // Refeições e água
  this.refeicoes = dados.meals || [];
  this.consumoAgua = this.litros.map(l => l <= (dados.waterIntake || 0));

  // Treino do dia
  this.treinoPorDia[this.diaAtual] = dados.workout;


  console.log('[✅] Fixed Dailies:', this.dailyQuests);
  console.log('[✅] Daily Huntings:', this.dailyHuntings);
  console.log('[✅] Weekly Huntings:', this.weeklyHuntings);
}

async carregarQuestsParaExibicao() {
  const {
    dailyQuests,
    weeklyQuests,
    dailyHuntingQuests,
    weeklyHuntingQuests,
  } = await this.userDataService.carregarQuestsDoDia();

  this.dailyQuests = dailyQuests;
  this.weeklyQuests = weeklyQuests;
  this.dailyHuntings = dailyHuntingQuests;
  this.weeklyHuntings = weeklyHuntingQuests;
}
// Xp e Level

  xpParaProximoNivel(nivel: number): number {
  return Math.floor(100 + nivel * 80);
}


  get progressoXP(): number {
  return Math.min((this.xpAtual / this.xpParaProximoNivel(this.nivelAtual)) * 100, 100);
}

  atualizarXPNoFront(valor: number) {
  this.xpAtual += valor;

  // ⬆️ Level up
  while (this.xpAtual >= this.xpParaProximoNivel(this.nivelAtual)) {
    this.xpAtual -= this.xpParaProximoNivel(this.nivelAtual);
    this.nivelAtual++;
  }

  // ⬇️ Level down
  while (this.xpAtual < 0 && this.nivelAtual > 1) {
    this.nivelAtual--;
    this.xpAtual += this.xpParaProximoNivel(this.nivelAtual);
  }
}

  async carregarTreinosDaSemana() {
  // 🏋️‍♂️ 1. Carrega os nomes dos treinos do usuário
  const userRef = await this.userDataService.getUserDocRef();
  const snapshot = await getDoc(userRef);
  const data = snapshot.data();

  if (data?.['treinos']) {
    this.treinos = data['treinos'].map((t: any) => t.nome);
    console.log('[✅] Nomes dos treinos carregados:', this.treinos);
  } else {
    this.treinos = [];
    console.log('[ℹ️] Nenhum treino cadastrado.');
  }

  // 🗓️ 2. Carrega os treinos feitos ao longo da semana
  const hoje = new Date();
  const inicioDaSemana = new Date(hoje);
  inicioDaSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo

  for (let i = 0; i < 7; i++) {
    const data = new Date(inicioDaSemana);
    data.setDate(inicioDaSemana.getDate() + i);

    const nomeDoDia = this.diasSemana[i];
    const dataString = data.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    const dados = await this.userDataService.getDiaData(dataString);
    this.treinoPorDia[nomeDoDia] = dados?.workout ?? null;
  }

  console.log('[📅 Treinos da semana carregados]', this.treinoPorDia);
}

  treinoFeitoNoDia(dia: string) {
    return this.treinoPorDia?.[dia] ?? null;
  }

   async marcarTreino(treino: string) {
  await this.userDataService.marcarTreinoNoDia(treino);

  // Após marcar, recarrega os dados reais do dia
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const dados = await this.userDataService.getDiaData(hoje);

  if (dados) {
    this.treinoPorDia[this.diaAtual] = dados.workout;
  }
}

trackByName(index: number, refeicao: Meal): string {
  return refeicao.nome;
}

//Anti Spam
bloqueado = false;
checkboxLoading = false;

private async comTravaDeTempo(acao: () => Promise<void>) {
  if (this.bloqueado) return;

  this.bloqueado = true;
  this.checkboxLoading = true;

  await acao();

  setTimeout(() => {
    this.bloqueado = false;
    this.checkboxLoading = false;
  }, 1000);
}


async toggleRefeicao(refeicao: Meal) {
  this.comTravaDeTempo(async () => {
    const novaConclusao = !refeicao.concluida;
    await this.userDataService.toggleRefeicao(refeicao.nome);

    const xp = novaConclusao ? 10 : -10;
    this.atualizarXPNoFront(xp);

    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dados = await this.userDataService.getDiaData(hoje);

    if (dados?.meals) {
      this.refeicoes = dados.meals.map(m => ({ ...m }));
      this.consumoAgua = this.litros.map(l => l <= (dados.waterIntake ?? 0));
    }
  });
}


  async toggleAgua(index: number) {
  this.comTravaDeTempo(async () => {
    const novoValor = !this.consumoAgua[index];
    const litros = this.litros[index];
    const delta = novoValor ? 1 : -1;
    const xp = delta * 5;

    await this.userDataService.marcarAguaNoDia(litros + (delta === 1 ? 0 : -1));
    this.atualizarXPNoFront(xp);

    const dados = await this.userDataService.getDiaData(
      new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    );
    this.consumoAgua = this.litros.map(l => l <= (dados?.waterIntake || 0));
  });
}


  async toggleDailyHunting(quest: QuestInstance) {
  this.comTravaDeTempo(async () => {
    const novaConclusao = !quest.concluida;
    await this.userDataService.toggleConclusaoHunting(quest.id, novaConclusao);

    const xp = novaConclusao ? 20 : -20;
    this.atualizarXPNoFront(xp);

    const { dailyHuntingQuests } = await this.userDataService.carregarQuestsDoDia();
    this.dailyHuntings = dailyHuntingQuests;
  });
}

async toggleWeeklyHunting(quest: QuestInstance) {
  this.comTravaDeTempo(async () => {
    const novaConclusao = !quest.concluida;
    await this.userDataService.toggleConclusaoHunting(quest.id, novaConclusao);

    const xp = novaConclusao ? 40 : -40;
    this.atualizarXPNoFront(xp);

    const { weeklyHuntingQuests } = await this.userDataService.carregarQuestsDoDia();
    this.weeklyHuntings = weeklyHuntingQuests;
  });
}

  async toggleFixedQuest(quest: QuestInstance) {
  this.comTravaDeTempo(async () => {
    const novaConclusao = !quest.concluida;
    await this.userDataService.toggleConclusaoFixedQuest(quest.id, novaConclusao);

    const xp = quest.categoria === 'daily'
      ? (novaConclusao ? 15 : -15)
      : (novaConclusao ? 30 : -30);

    this.atualizarXPNoFront(xp);

    const { dailyQuests, weeklyQuests } = await this.userDataService.carregarQuestsDoDia();
    this.dailyQuests = dailyQuests;
    this.weeklyQuests = weeklyQuests;
  });
}


mostrarCronometro(vencimento: string): boolean {
  const agora = Date.now();
  const tempoRestante = new Date(vencimento).getTime() - agora;
  return tempoRestante < 1000 * 60 * 60 * 12; // menos de 12h
}

getTempoRestante(vencimento: string): string {
  const tempo = new Date(vencimento).getTime() - Date.now();
  if (tempo <= 0) return '00:00:00';

  const horas = Math.floor(tempo / 3600000);
  const minutos = Math.floor((tempo % 3600000) / 60000);
  const segundos = Math.floor((tempo % 60000) / 1000);

  return `${this.pad(horas)}:${this.pad(minutos)}:${this.pad(segundos)}`;
}

pad(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}


  chartData = {
  labels: ['Força', 'Destreza', 'Inteligência', 'Constituição', 'Carisma', 'Sabedoria'],
  datasets: [
    {
      // label removido para não exibir texto no topo
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
      display: false, // Desativa a legenda para não sobrar espaço
    },
  },
};


  private xpTimeout: any = null;
  private levelTimeout: any = null;
}
