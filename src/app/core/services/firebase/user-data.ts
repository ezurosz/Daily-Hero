/**
 * Serviço responsável por gerenciar os dados do usuário no Firestore,
 * incluindo a criação de daily quests, hunting quests, dados diários e ações do usuário.
 */

import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { DailyQuest } from '../../models/daily-quest.model';
import { Quest } from '../../models/quest.model';
import { DiaData } from '../../models/dia-data.model';
import { firstValueFrom } from 'rxjs';
import { user } from 'rxfire/auth';

function questIgual(
  q1: { descricao: string; categoria: string; level: string },
  q2: { descricao: string; categoria: string; level: string }
): boolean {
  return (
    q1.descricao.trim().toLowerCase() === q2.descricao.trim().toLowerCase() &&
    q1.categoria === q2.categoria &&
    q1.level === q2.level
  );
}

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // 🔐 Autenticação e Referências ==========================
  async getUserDocRef() {
    const userData = await firstValueFrom(user(this.auth));
    if (!userData) throw new Error('Usuário não autenticado');
    return doc(this.firestore, 'users', userData.uid);
  }

  async getDiaDocRef(date: string) {
    const userData = await firstValueFrom(user(this.auth));
    if (!userData) throw new Error('Usuário não autenticado');
    return doc(this.firestore, `users/${userData.uid}/dias/${date}`);
  }

  // 📌 Inicialização do Usuário ============================
// 📌 Inicialização do Usuário ============================
async initUserDataIfNeeded() {
  const user = this.auth.currentUser;
  if (!user) return;

  const userRef = await this.getUserDocRef();
  const snapshot = await getDoc(userRef);

  // 🟢 Criação do documento principal do usuário
  if (!snapshot.exists()) {
    await setDoc(userRef, {
      nivel: 1,
      xp: 0,
      dailyQuests: [] as DailyQuest[],
      workoutList: ['Treino A', 'Treino B', 'Treino C', 'Treino D'],
      xpHistory: { lastEntry: null },
    });

    console.log('[✅ Firestore] Novo usuário inicializado.');
  } else {
    console.log('[ℹ️ Firestore] Documento do usuário já existe.');
  }

  // 🟠 Criação do documento diário inicial (subcoleção), sem quests
  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const diaSnap = await getDoc(diaRef);

  if (!diaSnap.exists()) {
    const novoDia: DiaData = {
      nivelNoDia: 1,
      xpGanho: 0,
      meals: {
        'Café da Manhã': false,
        'Almoço': false,
        'Lanche': false,
        'Jantar': false,
      },
      waterIntake: 0,
      workout: null,
      huntingQuests: [],
      dailyQuests: [],
    };

    await setDoc(diaRef, novoDia);
    console.log('[🟢 Firestore] Documento diário criado vazio (sem quests).');
  } else {
    console.log('[ℹ️ Firestore] Documento do dia já existia.');
  }
}

  // 📘 Lógica: Daily Quests ================================
  dailyQuests: DailyQuest[] = [];

  async addDefaultDailyQuests() {
    const ref = await this.getUserDocRef();
    const novas: DailyQuest[] = [
      { id: crypto.randomUUID(), descricao: 'Assistir o jogo 17:00', categoria: 'daily', level: 'médio', fixa: true, concluida: false },
      { id: crypto.randomUUID(), descricao: 'Evitar esforço no braço', categoria: 'weekly', level: 'médio', fixa: true, concluida: false },
      { id: crypto.randomUUID(), descricao: 'Meditar 10 min', categoria: 'daily', level: 'fácil', fixa: false, concluida: false },
      { id: crypto.randomUUID(), descricao: 'Fazer mobilidade pernas e quadril', categoria: 'weekly', level: 'difícil', fixa: false, concluida: false },
    ];

    const snapshot = await getDoc(ref);
    const existentes = (snapshot.data()?.['dailyQuests'] ?? []) as DailyQuest[];

    const novasFiltradas = novas.filter(
      (nova) => !existentes.some((existente) => questIgual(nova, existente))
    );

    if (novasFiltradas.length > 0) {
      await updateDoc(ref, {
        dailyQuests: [...existentes, ...novasFiltradas],
      });
      console.log(`[✅] ${novasFiltradas.length} novas daily quests adicionadas.`);
    } else {
      console.log('[ℹ️] Nenhuma nova daily quest foi adicionada.');
    }
  }

  /* async carregarDailyQuests(): Promise<void> {
    const ref = await this.getUserDocRef();
    const snapshot = await getDoc(ref);
    this.dailyQuests = (snapshot.data()?.['dailyQuests'] ?? []) as DailyQuest[];
  } */
  async carregarDailyQuests(): Promise<void> {
  const hoje = this.dataHoje(); // garante o formato correto
  const ref = await this.getDiaDocRef(hoje);
  const snapshot = await getDoc(ref);
  this.dailyQuests = (snapshot.data()?.['dailyQuests'] ?? []) as DailyQuest[];
  console.log('[📆] Daily quests carregadas do dia:', this.dailyQuests);
}



  async instanciarDailiesFixas() {
  const diaRef = await this.getDiaDocRef(this.dataHoje());
  const diaSnap = await getDoc(diaRef);
  const diaData = diaSnap.data() ?? {};

  const jaInstanciadas = (diaData['dailyQuests'] ?? []) as DailyQuest[];

  const userRef = await this.getUserDocRef();
  const userSnap = await getDoc(userRef);
  const todasDailies = (userSnap.data()?.['dailyQuests'] ?? []) as DailyQuest[];
  const fixas = todasDailies.filter((q) => q.fixa);

  const novas: DailyQuest[] = fixas.filter((fixa) => {
    return !jaInstanciadas.some((instanciada) =>
      fixa.descricao.trim().toLowerCase() === instanciada.descricao.trim().toLowerCase() &&
      fixa.categoria === instanciada.categoria &&
      fixa.level === instanciada.level
    );
  }).map((q) => ({
    ...q,
    concluida: false,
    checkDate: null
  }));

  if (novas.length > 0) {
    await updateDoc(diaRef, {
      dailyQuests: [...jaInstanciadas, ...novas]
    });
    console.log(`[✅] ${novas.length} novas dailies fixas adicionadas ao dia.`);
  } else {
    console.log('[ℹ️] Nenhuma daily fixa nova a adicionar.');
  }
}



  // 🎯 Lógica: Hunting Quests =============================

  huntingQuests: Quest[] = [];
async addDefaultHuntingQuests() {
  const diaRef = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(diaRef);

  const existentes = (snapshot.data()?.['huntingQuests'] ?? []) as Quest[];

  const novas: Quest[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Organizar ambiente de trabalho',
      categoria: 'daily',
      level: 'médio',
      vencimento: this.calcularVencimento('daily'),
      concluida: false,
      checkDate: null,
    },
    {
      id: crypto.randomUUID(),
      descricao: 'Estudar 1 capítulo de livro',
      categoria: 'weekly',
      level: 'difícil',
      vencimento: this.calcularVencimento('daily'),
      concluida: false,
      checkDate: null,
    },
    {
      id: crypto.randomUUID(),
      descricao: 'Planejar conteúdo da semana',
      categoria: 'daily',
      level: 'médio',
      vencimento: this.calcularVencimento('weekly'),
      concluida: false,
      checkDate: null,
    },
  ];

  const filtradas = novas.filter(
    (nova) =>
      !existentes.some((existente) =>
        questIgual(
          { descricao: nova.descricao, categoria: nova.categoria, level: nova.level },
          { descricao: existente.descricao, categoria: existente.categoria, level: existente.level }
        )
      )
  );

  if (filtradas.length > 0) {
    await updateDoc(diaRef, {
      huntingQuests: [...existentes, ...filtradas],
    });
    console.log(`[🟢] ${filtradas.length} hunting quests adicionadas ao dia.`);
  } else {
    console.log('[ℹ️] Nenhuma nova hunting quest foi adicionada (já existiam).');
  }
}

async carregarHuntingQuests(): Promise<void> {
  const hoje = this.dataHoje();
  console.log('[📅 Dia usado para hunting]', hoje);

  const diaRef = await this.getDiaDocRef(hoje);
  const snapshot = await getDoc(diaRef);

  const dados = snapshot.data();
  console.log('[📦 Conteúdo do documento do dia]', dados);

  this.huntingQuests = (dados?.['huntingQuests'] ?? []) as Quest[];
  console.log('[🎯 Hunting carregadas]', this.huntingQuests);
}

async toggleConclusaoQuest(questId: string, concluida: boolean) {
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  const dailyAtualizadas = data.dailyQuests.map((q) =>
    q.id === questId ? { ...q, concluida, checkDate: new Date().toISOString() } : q
  );

  await updateDoc(ref, {
    dailyQuests: dailyAtualizadas,
  });

  console.log(`[✅] Daily quest ${questId} marcada como concluída: ${concluida}`);
}

  async toggleConclusaoHunting(questId: string, concluida: boolean) {
    const ref = await this.getDiaDocRef(this.dataHoje());
    const snapshot = await getDoc(ref);
    const data = snapshot.data() as DiaData;

    const huntingQuestsAtualizadas = data.huntingQuests.map((q) =>
      q.id === questId ? { ...q, concluida, checkDate: new Date().toISOString() } : q
    );

    await updateDoc(ref, {
      huntingQuests: huntingQuestsAtualizadas,
    });

    console.log(`[✅] Hunting quest ${questId} marcada como concluída: ${concluida}`);
  }

  // 🍽️ Refeições, Água, Treino, XP ========================

  async adicionarXP(xp: number) {
    const ref = await this.getDiaDocRef(this.dataHoje());
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data) throw new Error('Documento do dia não encontrado');

    const xpAtual = data['xpGanho'] || 0;
    await updateDoc(ref, { xpGanho: xpAtual + xp });

    console.log(`[✨] XP atualizada: ${xpAtual} ➜ ${xpAtual + xp}`);
  }

  async marcarTreinoNoDia(nome: string | null) {
    const ref = await this.getDiaDocRef(this.dataHoje());
    await updateDoc(ref, { workout: nome });
  }

  async marcarAguaNoDia(litros: number) {
    const ref = await this.getDiaDocRef(this.dataHoje());
    await updateDoc(ref, { waterIntake: litros });
    console.log(`[💧] Água registrada: ${litros}L`);
  }

  async atualizarRefeicoes(meals: Record<string, boolean>) {
  const diaRef = await this.getDiaDocRef(this.dataHoje());
  await updateDoc(diaRef, { meals });
  console.log('[🍽️] Refeições atualizadas no Firestore:', meals);
}


  // 🛠️ Utilitários =============================
  private calcularVencimento(categoria: 'daily' | 'weekly') {
    const hoje = new Date();
    if (categoria === 'daily') return hoje.toISOString().split('T')[0];
    const fimDaSemana = new Date();
    fimDaSemana.setDate(hoje.getDate() + (7 - hoje.getDay()));
    return fimDaSemana.toISOString().split('T')[0];
  }

  private dataHoje(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}


  async getDiaData(date: string): Promise<DiaData | null> {
    const ref = await this.getDiaDocRef(date);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? (snapshot.data() as DiaData) : null;
  }
}
