import { Component, OnInit, inject } from '@angular/core';
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
import { HuntingTemplate } from '../../core/models/hunting-template';
import { toSignal } from '@angular/core/rxjs-interop';
import { RealTimeService } from '../../core/services/firebase/realtime-service';

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
export class PagePage implements OnInit {
  private authService = inject(AuthService);
  private userDataService = inject(UserDataService);
  private rt = inject(RealTimeService);
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

  // Nomes de treinos (workoutList) em tempo real
  workoutListSig = toSignal(this.rt.workoutList$(), { initialValue: [] as string[] });


  // ======== REALTIME via signals ========
  // Instâncias do dia (atualizam sozinhas sem F5)
  fixedQuests   = toSignal(this.rt.fixedInstances$(),   { initialValue: [] as QuestInstance[] });
  huntingQuests = toSignal(this.rt.huntingInstances$(), { initialValue: [] as HuntingTemplate[] });

  // getters para o template (usando as signals acima)
  get dailyHunting(): HuntingTemplate[] {
    return this.huntingQuests().filter(q => q.categoria === 'daily');
  }
  get weeklyHunting(): HuntingTemplate[] {
    return this.huntingQuests().filter(q => q.categoria === 'weekly');
  }
  get dailyFixed(): QuestInstance[] {
    return this.fixedQuests().filter(q => q.categoria === 'daily');
  }
  get weeklyFixed(): QuestInstance[] {
    return this.fixedQuests().filter(q => q.categoria === 'weekly');
  }

  mostrarXpTemporario = false;
  xpGanhoTemporario = 0;
  mostrarLevelUp = false;

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
    this.atualizarDiaAtual();
    this.isMobile = window.innerWidth <= 768;

    // Garante o documento do dia e instanciações iniciais
    await this.userDataService.criarDiaSeNaoExistir();
    await Promise.all([
      this.carregarTreinosDaSemana(),           // nomes dos treinos (workoutList)
      this.userDataService.instanciarFixedQuests(),
      this.userDataService.instanciarHuntingQuests(),
    ]);

    // Carrega XP/Nível do documento principal 1x (se quiser, dá pra ligar em tempo real depois)
    const userMainData = await this.userDataService.getUserMainData();
    if (userMainData) {
      this.nivelAtual = userMainData.nivel;
      this.xpAtual = userMainData.xp;
    }

    // Carrega dados de refeições/água do dia
    await this.carregarDadosDoUsuario();

    // Nada de setInterval de expiração aqui — realtime cobre a UI.
  }

  atualizarDiaAtual() {
    const hoje = new Date();
    const diaIndex = hoje.getDay();
    this.diaAtual = this.diasSemana[diaIndex];
  }

  async carregarDadosDoUsuario() {
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dados = await this.userDataService.getDiaData(hoje);
    if (!dados) return;

    // Refeições e água
    this.refeicoes = dados.meals || [];
    this.consumoAgua = this.litros.map(l => l <= (dados.waterIntake || 0));

    // Treino do dia (string com nome do treino)
    // Se você guarda isso como 'workout' no dia:
    // @ts-ignore caso o tipo de DiaData ainda não tenha a prop
    this.treinoPorDia[this.diaAtual] = (dados as any).workout ?? null;
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
  // 1) Pega a lista de treinos do signal (em tempo real)
  const workoutList = this.workoutListSig();

  // 2) Carrega o histórico de treinos executados nos últimos 7 dias
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

  console.log('[📅 Treinos da semana]', {
    workoutList,
    feitos: this.treinoPorDia
  });
}


  treinoFeitoNoDia(dia: string) {
    return this.treinoPorDia?.[dia] ?? null;
  }

  async marcarTreino(treino: string) {
    await this.userDataService.marcarTreinoNoDia(treino);

    // Atualiza o state local do dia atual
    const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dados = await this.userDataService.getDiaData(hoje);
    // @ts-ignore ver nota acima
    this.treinoPorDia[this.diaAtual] = (dados as any)?.workout ?? null;
  }

  trackByName(index: number, refeicao: Meal): string {
    return refeicao.nome;
  }

  // Anti-spam
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

  async toggleHuntingQuest(quest: HuntingTemplate) {
    this.comTravaDeTempo(async () => {
      const novaConclusao = !quest.concluida;
      await this.userDataService.toggleConclusaoHunting(quest.id, novaConclusao);

      const xp = quest.categoria === 'daily'
        ? (novaConclusao ? 20 : -20)
        : (novaConclusao ? 40 : -40);

      this.atualizarXPNoFront(xp);
      // listas atualizam via realtime
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
      // listas atualizam via realtime
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
        display: false,
      },
    },
  };

  private xpTimeout: any = null;
  private levelTimeout: any = null;
}
