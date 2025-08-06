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
  docData
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { FixedQuest } from '../../models/fixed-quest.model';
import { Quest } from '../../models/quest.model';
import { DiaData } from '../../models/dia-data.model';
import { firstValueFrom, Observable } from 'rxjs';
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

  dailyFixedQuests: FixedQuest[] = [];
  weeklyFixedQuests: FixedQuest[] = [];
  dailyHuntingQuests: Quest[] = [];
  weeklyHuntingQuests: Quest[] = [];
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


  async criarDiaSeNaoExistir(): Promise<void> {
  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const diaSnap = await getDoc(diaRef);

  if (!diaSnap.exists()) {
    const novoDia: DiaData = {
      nivelNoDia: 1,
      xpGanho: 0,
      meals: [
        {
          nome: 'Café da Manhã',
          concluida: false,
          cardapio: `• 40g de aveia em flocos finos
• 1 scoop de whey com água
• 1 banana média (100g)
• 1 colher de sopa de pasta de amendoim (15g)
• 1 colher chá de chia (5g)
• Canela a gosto`,
          kcal: 475,
          carboidrato: 49,
          proteina: 33,
          gordura: 10,
        },
        {
          nome: 'Almoço',
          concluida: false,
          cardapio: `• 160g arroz branco cozido
• 200g frango grelhado
• 1 ovo inteiro
• 130g legumes refogados (abobrinha, cenoura, etc)
• 12g azeite no preparo`,
          kcal: 783,
          carboidrato: 62,
          proteina: 52,
          gordura: 25,
        },
        {
          nome: 'Lanche',
          concluida: false,
          cardapio: `• 1 Barrinha Protein Crisp 45g`,
          kcal: 180,
          carboidrato: 17,
          proteina: 15,
          gordura: 7,
        },
        {
          nome: 'Jantar',
          concluida: false,
          cardapio: `• 130g arroz branco cozido
• 140g carne moída magra (ou frango)
• 1 ovo inteiro
• 130g legumes cozidos/refogados
• 12g azeite`,
          kcal: 653,
          carboidrato: 53,
          proteina: 34,
          gordura: 27,
        },
      ],
      waterIntake: 0,
      workout: null,
      dailyHuntingQuests: [] as Quest[],
      weeklyHuntingQuests: [] as Quest[],
      dailyQuests: [] as Quest[],   // inicializa vazio
      weeklyQuests: [] as Quest[],  // inicializa vazio
    };

    await setDoc(diaRef, novoDia);
    console.log('[📅] Documento diário criado automaticamente.');
  }
}

  

  // 📌 Inicialização do Usuário ============================
async initUserDataIfNeeded() {
  const user = this.auth.currentUser;
  if (!user) return;

  const userRef = await this.getUserDocRef();
  const snapshot = await getDoc(userRef);

  // Se não existir, cria documento principal com fixedQuests diário/semana
  if (!snapshot.exists()) {
  await setDoc(userRef, {
    nivel: 1,
    xp: 0,
    fixedQuests: {
      daily: [] as FixedQuest[],
      weekly: [] as FixedQuest[],
    },
    workoutList: ['Treino A', 'Treino B', 'Treino C', 'Treino D'],
    xpHistory: { lastEntry: null },
  });
  console.log('[✅ Firestore] Novo usuário inicializado.');
}
 else {
    console.log('[ℹ️ Firestore] Documento do usuário já existe.');
  }
}



  // 📘 Lógica: Daily Quests ================================
  dailyQuests: FixedQuest[] = [];
  weeklyQuests: FixedQuest[] = [];

  async addDefaultFixedQuests() {
  const userRef = await this.getUserDocRef();
  const snap = await getDoc(userRef);

  const existentesDaily = (snap.data()?.['dailyFixedQuests'] ?? []) as FixedQuest[];
  const existentesWeekly = (snap.data()?.['weeklyFixedQuests'] ?? []) as FixedQuest[];

  const novasDaily: FixedQuest[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Aniversário de 1 amigo',
      categoria: 'daily',
      level: 'fácil',
      fixa: true,
      tags: ['Social'],
    }
  ];

  const novasWeekly: FixedQuest[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Limpar armário',
      categoria: 'weekly',
      level: 'médio',
      fixa: true,
    }
  ];

  const toAddDaily = novasDaily.filter(n => !existentesDaily.some(e => questIgual(n,e)));
  const toAddWeekly = novasWeekly.filter(n => !existentesWeekly.some(e => questIgual(n,e)));

  if (toAddDaily.length || toAddWeekly.length) {
    await updateDoc(userRef, {
      'fixedQuests.daily': [...existentesDaily, ...toAddDaily],
      'fixedQuests.weekly': [...existentesWeekly, ...toAddWeekly],
    });
    console.log('[✅] FixedQuests padrão adicionadas');
  }
}


 async carregarFixedQuests(): Promise<void> {
  const ref = await this.getUserDocRef();
  const snapshot = await getDoc(ref);
  const dados = snapshot.data();

  this.dailyFixedQuests = (dados?.['fixedQuests']?.['daily'] ?? []) as FixedQuest[];
  this.weeklyFixedQuests = (dados?.['fixedQuests']?.['weekly'] ?? []) as FixedQuest[];

  console.log('[📌 FixedQuests carregadas]', {
    daily: this.dailyFixedQuests,
    weekly: this.weeklyFixedQuests,
  });
}


  async instanciarFixedQuests() {
  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const diaSnap = await getDoc(diaRef);
  const diaData = diaSnap.data() ?? {};

  const jaInstanciadasDaily = (diaData['dailyQuests'] ?? []) as FixedQuest[];
  const jaInstanciadasWeekly = (diaData['weeklyQuests'] ?? []) as FixedQuest[];

  const userRef = await this.getUserDocRef();
  const userSnap = await getDoc(userRef);
  const dataUser = userSnap.data() ?? {};

  const allDaily = (dataUser['fixedQuests']?.daily ?? []) as FixedQuest[];
  const allWeekly = (dataUser['fixedQuests']?.weekly ?? []) as FixedQuest[];

  const fixasDaily = allDaily.filter(q => q.fixa);
  const fixasWeekly = allWeekly.filter(q => q.fixa);

  const novasDaily: Quest[] = fixasDaily
  .filter((fixa) =>
    !jaInstanciadasDaily.some((inst) => questIgual(fixa, inst))
  )
  .map((q) => ({
    id: q.id,
    descricao: q.descricao,
    categoria: q.categoria,
    level: q.level,
    concluida: false,
    checkDate: null,
    vencimento: this.calcularVencimento('daily'),
    tags: q.tags ?? [],
    expirado: false,
  }));

const novasWeekly: Quest[] = fixasWeekly
  .filter((fixa) =>
    !jaInstanciadasWeekly.some((inst) => questIgual(fixa, inst))
  )
  .map((q) => ({
    id: q.id,
    descricao: q.descricao,
    categoria: q.categoria,
    level: q.level,
    concluida: false,
    checkDate: null,
    vencimento: this.calcularVencimento('weekly'),
    tags: q.tags ?? [],
    expirado: false,
  }));


  const atualizacoes: any = {};
  if (novasDaily.length > 0)
    atualizacoes['dailyQuests'] = [...jaInstanciadasDaily, ...novasDaily];
  if (novasWeekly.length > 0)
    atualizacoes['weeklyQuests'] = [...jaInstanciadasWeekly, ...novasWeekly];

  if (Object.keys(atualizacoes).length > 0) {
    await updateDoc(diaRef, atualizacoes);
    console.log(`[✅] ${novasDaily.length} dailies e ${novasWeekly.length} weeklies fixas adicionadas ao dia.`);
  } else {
    console.log('[ℹ️] Nenhuma fixed quest nova a instanciar no dia.');
  }
}




  // 🎯 Lógica: Hunting Quests =============================

  huntingQuests: Quest[] = [];
async addDefaultHuntingQuests() {
  const diaRef = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(diaRef);
  const data = snapshot.data() ?? {};

  const existentesDaily = (data['dailyHuntingQuests'] ?? []) as Quest[];
  const existentesWeekly = (data['weeklyHuntingQuests'] ?? []) as Quest[];

  const novasDaily: Quest[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Rezar por 10 minutos',
      categoria: 'daily',
      level: 'médio',
      vencimento: this.calcularVencimento('daily'),
      concluida: false,
      checkDate: null,
      tags: ['Fé'],
      expirado: false,
    },
  ];

  const novasWeekly: Quest[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Estudar 3 horas no sábado',
      categoria: 'weekly',
      level: 'difícil',
      vencimento: this.calcularVencimento('weekly'),
      concluida: false,
      checkDate: null,
      tags: ['Estudo'],
      expirado: false,
    },
  ];

  const filtradasDaily = novasDaily.filter(
    (nova) =>
      !existentesDaily.some((existente) =>
        questIgual(
          { descricao: nova.descricao, categoria: nova.categoria, level: nova.level },
          { descricao: existente.descricao, categoria: existente.categoria, level: existente.level }
        )
      )
  );

  const filtradasWeekly = novasWeekly.filter(
    (nova) =>
      !existentesWeekly.some((existente) =>
        questIgual(
          { descricao: nova.descricao, categoria: nova.categoria, level: nova.level },
          { descricao: existente.descricao, categoria: existente.categoria, level: existente.level }
        )
      )
  );

  const updates: any = {};
  if (filtradasDaily.length > 0)
    updates['dailyHuntingQuests'] = [...existentesDaily, ...filtradasDaily];

  if (filtradasWeekly.length > 0)
    updates['weeklyHuntingQuests'] = [...existentesWeekly, ...filtradasWeekly];

  if (Object.keys(updates).length > 0) {
    await updateDoc(diaRef, updates);
    console.log(`[🟢] Hunting quests adicionadas:`, updates);
  } else {
    console.log('[ℹ️] Nenhuma nova hunting quest foi adicionada (já existiam).');
  }
}


async carregarHuntingQuests(): Promise<void> {
  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const snapshot = await getDoc(diaRef);

  const dados = snapshot.data();
  if (!dados) return;

  this.dailyHuntingQuests = (dados['dailyHuntingQuests'] ?? []) as Quest[];
  this.weeklyHuntingQuests = (dados['weeklyHuntingQuests'] ?? []) as Quest[];

  // ⚠️ Agenda vencimento para todas
  this.dailyHuntingQuests.forEach(q => this.agendarExpiracao(q, 'dailyHunting'));
  this.weeklyHuntingQuests.forEach(q => this.agendarExpiracao(q, 'weeklyHunting'));

  console.log('[🎯 Hunting carregadas]', {
    daily: this.dailyHuntingQuests,
    weekly: this.weeklyHuntingQuests,
  });
}



async toggleConclusaoFixedQuest(questId: string, concluida: boolean) {
  await this.criarDiaSeNaoExistir();
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  // Decide se a quest é daily ou weekly
  const isDaily = data.dailyQuests.some((q: Quest) => q.id === questId);
  const listKey = isDaily ? 'dailyQuests' : 'weeklyQuests';

  // Atualiza a quest com base no ID
  const atualizadas = (data[listKey] as Quest[]).map((q: Quest) =>
    q.id === questId
      ? {
          ...q,
          concluida,
          checkDate: concluida ? new Date().toISOString() : null,
        }
      : q
  );

  await updateDoc(ref, { [listKey]: atualizadas });

  const quest = atualizadas.find((q) => q.id === questId)!;

  // XP com base na categoria da quest
  let xp = 0;
  if (quest.categoria === 'daily') xp = concluida ? 15 : -15;
  else if (quest.categoria === 'weekly') xp = concluida ? 30 : -30;

  await this.adicionarXP(xp);
  await this.atualizarXPGlobal(xp);

  console.log(`[✅] Fixed quest ${questId} atualizada. XP: ${xp}`);
}


 async toggleConclusaoHunting(questId: string, concluida: boolean) {
  await this.criarDiaSeNaoExistir();
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  // Decide em qual array a quest está
  const isDaily = data.dailyHuntingQuests.some((q: Quest) => q.id === questId);
  const listKey = isDaily ? 'dailyHuntingQuests' : 'weeklyHuntingQuests';

  // Mapeia e atualiza apenas a quest clicada
  const huntingAtualizadas = (data[listKey] as Quest[]).map((q: Quest) =>
    q.id === questId
      ? { ...q, concluida, checkDate: new Date().toISOString() }
      : q
  );

  // Grava de volta no Firestore
  await updateDoc(ref, { [listKey]: huntingAtualizadas });

  // Calcula XP com base na categoria da própria quest
  const quest = huntingAtualizadas.find((q: Quest) => q.id === questId)!;
  let xp = 0;
  if (quest.categoria === 'daily') xp = concluida ? 20 : -20;
  else if (quest.categoria === 'weekly') xp = concluida ? 40 : -40;

  await this.adicionarXP(xp);
  await this.atualizarXPGlobal(xp);

  console.log(`[✅] Hunting quest ${questId} atualizada. XP: ${xp}`);
}

  // 🍽️ Refeições, Água, Treino, XP ========================

  async adicionarXP(xp: number) {
     await this.criarDiaSeNaoExistir();
    const ref = await this.getDiaDocRef(this.dataHoje());
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data) throw new Error('Documento do dia não encontrado');

    const xpAtual = data['xpGanho'] || 0;
    await updateDoc(ref, { xpGanho: xpAtual + xp });

    console.log(`[✨] XP atualizada: ${xpAtual} ➜ ${xpAtual + xp}`);
  }

  async atualizarXPGlobal(valor: number) {
  const userRef = await this.getUserDocRef();
  const snapshot = await getDoc(userRef);

  let xpAtual = snapshot.data()?.['xp'] ?? 0;
  let nivelAtual = snapshot.data()?.['nivel'] ?? 1;

  xpAtual += valor;

  // Level Up
  while (xpAtual >= this.xpParaProximoNivel(nivelAtual)) {
    xpAtual -= this.xpParaProximoNivel(nivelAtual);
    nivelAtual++;
    console.log(`[🆙] Subiu para o nível ${nivelAtual}`);
  }

  // Level Down (se permitir regressão)
  while (xpAtual < 0 && nivelAtual > 1) {
    nivelAtual--;
    xpAtual += this.xpParaProximoNivel(nivelAtual);
    console.log(`[⬇️] Recuou para o nível ${nivelAtual}`);
  }

  await updateDoc(userRef, { xp: xpAtual, nivel: nivelAtual });
  console.log(`[🔥] XP global atualizada: XP = ${xpAtual}, Nível = ${nivelAtual}`);
}

  private xpParaProximoNivel(nivel: number): number {
  return Math.floor(100 + nivel * 80); // Fórmula usada no componente
}

  async marcarTreinoNoDia(nome: string | null) {
  await this.criarDiaSeNaoExistir();
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  const treinoAnterior = data.workout; // valor ANTES da alteração

  await updateDoc(ref, { workout: nome });

  // Só ganha XP se o treino anterior era null, e o novo nome não for null
  if (treinoAnterior === null && nome !== null) {
    const xp = 30;
    await this.adicionarXP(xp);
    await this.atualizarXPGlobal(xp);
    console.log(`[🏋️] Primeiro treino do dia registrado: "${nome}". XP: ${xp}`);
  } else {
    console.log(`[🏋️] Treino atualizado para: "${nome}". Sem alteração de XP.`);
  }
}

   async marcarAguaNoDia(litros: number) {
    await this.criarDiaSeNaoExistir();
    const ref = await this.getDiaDocRef(this.dataHoje());
    const snapshot = await getDoc(ref);
    const data = snapshot.data() as DiaData;
    const litrosAnteriores = data.waterIntake || 0;
    await updateDoc(ref, { waterIntake: litros });
    const delta = litros - litrosAnteriores;
    const xp = delta * 5;
    if (xp !== 0) {
      await this.adicionarXP(xp);
      await this.atualizarXPGlobal(xp);
    }
  }

  async toggleRefeicao(nomeRefeicao: string): Promise<void> {
  await this.criarDiaSeNaoExistir();
  const diaRef = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(diaRef);

  if (!snapshot.exists()) return;

  const data = snapshot.data() as DiaData;
  const refeicoes = data.meals || [];

  let xpDelta = 0;

  const refeicoesAtualizadas = refeicoes.map(ref => {
    if (ref.nome === nomeRefeicao) {
      const novaConclusao = !ref.concluida;
      xpDelta += novaConclusao ? 10 : -10;
      return { ...ref, concluida: novaConclusao };
    }
    return ref;
  });

  await updateDoc(diaRef, { meals: refeicoesAtualizadas });

  if (xpDelta !== 0) {
    await this.adicionarXP(xpDelta);
    await this.atualizarXPGlobal(xpDelta);
  }
}


async carregarQuestsDoDia(): Promise<{
  dailyQuests: Quest[],
  weeklyQuests: Quest[],
  dailyHuntingQuests: Quest[],
  weeklyHuntingQuests: Quest[]
}> {
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  return {
    dailyQuests: data?.dailyQuests ?? [],
    weeklyQuests: data?.weeklyQuests ?? [],
    dailyHuntingQuests: data?.dailyHuntingQuests ?? [],
    weeklyHuntingQuests: data?.weeklyHuntingQuests ?? [],
  };
}


  // 🛠️ Utilitários =============================
  private calcularVencimento(categoria: 'daily' | 'weekly'): string {
  const agora = new Date();

  if (categoria === 'daily') {
    agora.setHours(agora.getHours() + 24);
  } else if (categoria === 'weekly') {
    agora.setDate(agora.getDate() + 7);
  }

  return agora.toISOString(); // inclui data e hora completas
}


  private dataHoje(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

  async getDiaData(date: string): Promise<DiaData | null> {
    const ref = await this.getDiaDocRef(date);
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? (snapshot.data() as DiaData) : null;
  }

  //Puxando dados da coleção principal
  async getUserMainData(): Promise<{ nivel: number; xp: number } | null> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return null;

    const ref = doc(this.firestore, `users/${uid}`);
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data) return null;

    return {
      nivel: data['nivel'] ?? 1,
      xp: data['xp'] ?? 0,
  };

}

  agendarExpiracao(quest: Quest, tipo: 'dailyHunting' | 'weeklyHunting') {
  const agora = new Date();
  const vencimento = new Date(quest.vencimento);

  if (vencimento <= agora) {
    this.marcarExpiradaLocalmente(quest.id, tipo);
    return;
  }

  const delay = vencimento.getTime() - agora.getTime();

  setTimeout(() => {
    this.marcarExpiradaLocalmente(quest.id, tipo);
  }, delay);
}

private marcarExpiradaLocalmente(questId: string, tipo: 'dailyHunting' | 'weeklyHunting') {
  const lista =
    tipo === 'dailyHunting' ? this.dailyHuntingQuests : this.weeklyHuntingQuests;

  const novaLista = lista.map(q =>
    q.id === questId ? { ...q, expirado: true } : q
  );

  if (tipo === 'dailyHunting') this.dailyHuntingQuests = novaLista;
  else this.weeklyHuntingQuests = novaLista;

  console.log(`⚠️ Quest expirou: ${questId}`);
}

verificarExpiradas(quests: Quest[]): Quest[] {
  const agora = Date.now();
  return quests.map((q) => {
    if (!q.concluida && !q.expirado && new Date(q.vencimento).getTime() < agora) {
      // Aqui é o ponto em que precisamos:
      // 1. Marcar localmente
      // 2. Gravar no Firestore
      this.marcarComoExpiradaNoFirestore(q); // async
      return { ...q, expirado: true };
    }
    return q;
  });
}

async marcarComoExpiradaNoFirestore(quest: Quest) {
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snap = await getDoc(ref);
  const data = snap.data() as DiaData;

  const key = quest.categoria === 'daily' ? 'dailyQuests' :
              quest.categoria === 'weekly' ? 'weeklyQuests' :
              quest.categoria === 'dailyHunting' ? 'dailyHuntingQuests' :
              'weeklyHuntingQuests';

  const updatedList = (data[key] ?? []).map((q: Quest) =>
    q.id === quest.id ? { ...q, expirado: true } : q
  );

  await updateDoc(ref, { [key]: updatedList });
  console.log(`🔥 Quest ${quest.id} marcada como expirada no Firestore`);
}

async setXP(xp: number, nivel: number) {
  const ref = await this.getUserDocRef();
  await updateDoc(ref, { xp, nivel });
}


}
