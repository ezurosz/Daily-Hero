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
import { FixedQuestTemplate } from '../../models/fixed-quest-template.model';
import { QuestInstance } from '../../models/quest-instance.model';
import { HuntingTemplate } from '../../models/hunting-template';
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

  dailyFixedQuests: FixedQuestTemplate[] = [];
  weeklyFixedQuests: FixedQuestTemplate[] = [];
  dailyHuntingQuests: QuestInstance[] = [];
  weeklyHuntingQuests: QuestInstance[] = [];
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
      dailyHuntingQuests: [] as HuntingTemplate[],
      weeklyHuntingQuests: [] as HuntingTemplate[],
      dailyQuests: [] as QuestInstance[],   // inicializa vazio
      weeklyQuests: [] as QuestInstance[],  // inicializa vazio
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
      daily: [] as FixedQuestTemplate[],
      weekly: [] as FixedQuestTemplate[],
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



  // 📘 Lógica: Fixed Quests (CATÁLOGO)
dailyQuests: FixedQuestTemplate[] = [];
weeklyQuests: FixedQuestTemplate[] = [];

// 📘 Lógica: Fixed Quests (CATÁLOGO UNIFICADO EM fixedQuests[])
async addDefaultFixedQuests() {
  const userRef = await this.getUserDocRef();
  const snap = await getDoc(userRef);
  const data = snap.data() ?? {};

  // agora tudo em um único array no principal
  const existentes = (data['fixedQuests'] ?? []) as FixedQuestTemplate[];

  // defaults (já com rev:1)
  const novas: FixedQuestTemplate[] = [
    {
      id: crypto.randomUUID(),
      descricao: 'Aniversário de 1 amigo',
      categoria: 'daily',
      level: 'fácil',
      fixa: true,
      tags: ['Social'],
      rev: 1,
    },
    {
      id: crypto.randomUUID(),
      descricao: 'Limpar armário',
      categoria: 'weekly',
      level: 'médio',
      fixa: true,
      rev: 1,
    },
  ];

  // evita duplicar por id OU por igualdade semântica (descricao/categoria/level)
  const aAdicionar = novas.filter(n =>
    !existentes.some(e =>
      e.id === n.id ||
      questIgual(
        { descricao: n.descricao, categoria: n.categoria, level: n.level },
        { descricao: e.descricao, categoria: e.categoria, level: e.level }
      )
    )
  );

  if (aAdicionar.length > 0) {
    await updateDoc(userRef, { fixedQuests: [...existentes, ...aAdicionar] });
    const addDaily = aAdicionar.filter(q => q.categoria === 'daily').length;
    const addWeekly = aAdicionar.filter(q => q.categoria === 'weekly').length;
    console.log(`[✅] FixedQuests adicionadas: +${addDaily} daily, +${addWeekly} weekly`);
  } else {
    console.log('[ℹ️] Nenhuma FixedQuest nova a adicionar (já existiam).');
  }
}


// 📘 Carrega o CATÁLOGO unificado de Fixed (principal)
async carregarFixedQuests(): Promise<void> {
  const ref = await this.getUserDocRef();
  const snapshot = await getDoc(ref);
  const dados = snapshot.data() ?? {};

  const templates = (dados['fixedQuests'] ?? []) as FixedQuestTemplate[];

  // normaliza rev (se vier undefined, trata como 1)
  const norm = templates.map(t => ({ ...t, rev: t.rev && t.rev > 0 ? t.rev : 1 }));

  // mantém compatibilidade com quem espera arrays separados em memória
  this.dailyFixedQuests  = norm.filter(t => t.categoria === 'daily');
  this.weeklyFixedQuests = norm.filter(t => t.categoria === 'weekly');

  console.log('[📌 FixedQuests carregadas (principal)]', {
    total: norm.length,
    daily: this.dailyFixedQuests.length,
    weekly: this.weeklyFixedQuests.length,
  });
}


  // 🏁 Instancia as FIXED no DIA usando array unificado: fixedQuests
async instanciarFixedQuests() {
  await this.criarDiaSeNaoExistir();

  const hoje   = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const diaSnap = await getDoc(diaRef);
  const diaData = diaSnap.data() ?? {};

  // novo array unificado no dia
  const jaInstanciadas = (diaData['fixedQuests'] ?? []) as QuestInstance[];

  const userRef  = await this.getUserDocRef();
  const userSnap = await getDoc(userRef);
  const dataUser = userSnap.data() ?? {};

  const allDaily  = (dataUser['fixedQuests']?.daily  ?? []) as FixedQuestTemplate[];
  const allWeekly = (dataUser['fixedQuests']?.weekly ?? []) as FixedQuestTemplate[];

  const fixasDaily  = allDaily.filter(q => q.fixa);
  const fixasWeekly = allWeekly.filter(q => q.fixa);

  // helper para não duplicar
  const jaExiste = (tmpl: FixedQuestTemplate) =>
    jaInstanciadas.some(inst => inst.id === tmpl.id || questIgual(tmpl, inst));

  // cria instâncias com vínculo/versão e estado resetado
  const novasDaily: QuestInstance[] = fixasDaily
    .filter(t => !jaExiste(t))
    .map(t => ({
      id: t.id,

      // vínculo + versão aplicada
      templateId: t.id,
      templateType: 'fixed',
      appliedRev: t.rev && t.rev > 0 ? t.rev : 1,

      // snapshot do template
      descricao: t.descricao,
      categoria: 'daily',
      level: t.level,
      tags: t.tags ?? [],

      // estado do dia
      vencimento: this.calcularVencimento('daily'),
      concluida: false,
      checkDate: null,
      expirado: false,
    }));

  const novasWeekly: QuestInstance[] = fixasWeekly
    .filter(t => !jaExiste(t))
    .map(t => ({
      id: t.id,

      // vínculo + versão aplicada
      templateId: t.id,
      templateType: 'fixed',
      appliedRev: t.rev && t.rev > 0 ? t.rev : 1,

      // snapshot do template
      descricao: t.descricao,
      categoria: 'weekly',
      level: t.level,
      tags: t.tags ?? [],

      // estado do dia
      vencimento: this.calcularVencimento('weekly'),
      concluida: false,
      checkDate: null,
      expirado: false,
    }));

  const novas = [...novasDaily, ...novasWeekly];

  if (novas.length > 0) {
    await updateDoc(diaRef, { fixedQuests: [...jaInstanciadas, ...novas] });
    console.log(`[✅] Fixed instanciadas no dia (unificado): +${novas.length}`);
  } else {
    console.log('[ℹ️] Nenhuma fixed quest nova a instanciar no dia.');
  }
}


// 🎯 Lógica: Hunting Quests =============================
huntingQuests: HuntingTemplate[] = [];

async addDefaultHuntingQuests() {
  const userRef = await this.getUserDocRef();
  const snapshot = await getDoc(userRef);
  const data = snapshot.data() ?? {};

  const existentes = (data['huntingQuests'] ?? []) as HuntingTemplate[];

  const novasDaily: HuntingTemplate[] = [
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
      rev: 1, // NOVO
    },
  ];

  const novasWeekly: HuntingTemplate[] = [
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
      rev: 1, // NOVO
    },
  ];

  const novasTodas = [...novasDaily, ...novasWeekly];

  // Evita duplicar por id OU por igualdade semântica (descricao/categoria/level)
  const novasFiltradas = novasTodas.filter(nova =>
    !existentes.some(ex =>
      ex.id === nova.id ||
      questIgual(
        { descricao: nova.descricao, categoria: nova.categoria, level: nova.level },
        { descricao: ex.descricao,   categoria: ex.categoria,   level: ex.level }
      )
    )
  );

  if (novasFiltradas.length > 0) {
    const novasFinal = [...existentes, ...novasFiltradas];
    await updateDoc(userRef, { huntingQuests: novasFinal });
    console.log(`[🟢] Hunting templates adicionadas ao catálogo:`, novasFiltradas);
  } else {
    console.log('[ℹ️] Nenhuma hunting nova adicionada (já existia).');
  }
}


// Instancia HUNTINGS no dia unificado: huntingQuests
async instanciarHuntingQuests() {
  await this.criarDiaSeNaoExistir();

  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const diaSnap = await getDoc(diaRef);
  const diaData = diaSnap.data() ?? {};

  // novo array unificado no dia
  const jaInstanciadas = (diaData['huntingQuests'] ?? []) as HuntingTemplate[];

  const userRef = await this.getUserDocRef();
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() ?? {};

  // catálogo principal de huntings (seu "template" de hunting; hoje tem shape de Quest)
  const todasHunting = (userData['huntingQuests'] ?? []) as HuntingTemplate[]; // ou HuntingTemplate

  const novas = todasHunting
    // evita duplicar: não cria se já existir instância com mesmo id OU conteúdo equivalente
    .filter(t => !jaInstanciadas.some(inst => inst.id === t.id || questIgual(t, inst)))
    // cria a instância diária mantendo vencimento do template e resetando estado
    .map(t => {
      const rev = (t as any).rev && (t as any).rev > 0 ? (t as any).rev : 1;
      return {
        id: t.id,
        // vínculo + versão aplicada
        templateId: t.templateId ?? t.id,
        templateType: 'hunting' as const,
        appliedRev: t.appliedRev ?? rev,

        // snapshot do template que aparece no dia
        descricao: t.descricao,
        categoria: t.categoria,
        level: t.level,
        tags: t.tags ?? [],

        // estado do dia
        vencimento: t.vencimento, // se preferir recalcular: this.calcularVencimento(t.categoria)
        concluida: false,
        checkDate: null,
        expirado: false,
      } as HuntingTemplate;
    });

  if (novas.length > 0) {
    await updateDoc(diaRef, { huntingQuests: [...jaInstanciadas, ...novas] });
    console.log(`[✅] Huntings instanciadas: +${novas.length} (array unificado huntingQuests).`);
  } else {
    console.log('[ℹ️] Nenhuma hunting nova a instanciar no dia.');
  }
}



// Carrega HUNTINGS do dia unificado e agenda vencimento
async carregarHuntingQuests(): Promise<void> {
  const hoje = this.dataHoje();
  const diaRef = await this.getDiaDocRef(hoje);
  const snapshot = await getDoc(diaRef);

  const dados = snapshot.data();
  if (!dados) return;

  // novo array unificado no dia
  const hunting = (dados['huntingQuests'] ?? []) as HuntingTemplate[];

  // se você mantiver as propriedades públicas de classe:
  // this.huntingQuests = hunting;

  // agendar expiração respeitando a categoria (reusa sua função existente)
  hunting.forEach(q => {
    const tipo = q.categoria === 'daily' ? 'dailyHunting' : 'weeklyHunting';
    this.agendarExpiracao(q, tipo as any);
  });

  console.log('[🎯 Hunting carregadas (unificado)]', {
    total: hunting.length,
    daily: hunting.filter(q => q.categoria === 'daily').length,
    weekly: hunting.filter(q => q.categoria === 'weekly').length,
  });
}




async toggleConclusaoFixedQuest(questId: string, concluida: boolean) {
  await this.criarDiaSeNaoExistir();
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  // Decide se a quest é daily ou weekly
  const isDaily = data.dailyQuests.some((q: QuestInstance) => q.id === questId);
  const listKey = isDaily ? 'dailyQuests' : 'weeklyQuests';

  // Atualiza a quest com base no ID
  const atualizadas = (data[listKey] as QuestInstance[]).map((q: QuestInstance) =>
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

  await this.adicionarXPNoDia(xp);
  await this.atualizarXPGlobal(xp);

  console.log(`[✅] Fixed quest ${questId} atualizada. XP: ${xp}`);
}


 async toggleConclusaoHunting(questId: string, concluida: boolean) {
  await this.criarDiaSeNaoExistir();
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snapshot = await getDoc(ref);
  const data = snapshot.data() as DiaData;

  // Decide em qual array a quest está
  const isDaily = data.dailyHuntingQuests.some((q: QuestInstance) => q.id === questId);
  const listKey = isDaily ? 'dailyHuntingQuests' : 'weeklyHuntingQuests';

  // Mapeia e atualiza apenas a quest clicada
  const huntingAtualizadas = (data[listKey] as QuestInstance[]).map((q: QuestInstance) =>
    q.id === questId
      ? { ...q, concluida, checkDate: new Date().toISOString() }
      : q
  );

  // Grava de volta no Firestore
  await updateDoc(ref, { [listKey]: huntingAtualizadas });

  // Calcula XP com base na categoria da própria quest
  const quest = huntingAtualizadas.find((q: QuestInstance) => q.id === questId)!;
  let xp = 0;
  if (quest.categoria === 'daily') xp = concluida ? 20 : -20;
  else if (quest.categoria === 'weekly') xp = concluida ? 40 : -40;

  await this.adicionarXPNoDia(xp);
  await this.atualizarXPGlobal(xp);

  console.log(`[✅] Hunting quest ${questId} atualizada. XP: ${xp}`);
}

  // 🍽️ Refeições, Água, Treino, XP ========================

  async adicionarXPNoDia(xp: number) {
     await this.criarDiaSeNaoExistir();
    const ref = await this.getDiaDocRef(this.dataHoje());
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data) throw new Error('Documento do dia não encontrado');

    const xpAtual = data['xpGanho'] || 0;
    await updateDoc(ref, { xpGanho: xpAtual + xp });

    console.log(`[✨] XP do dia atualizada: ${xpAtual} ➜ ${xpAtual + xp}`);
  }

  async atualizarXPGlobal(valor: number) {
  const userRef = await this.getUserDocRef();
  const snapshot = await getDoc(userRef);

  let xpTotal = snapshot.data()?.['xp'] ?? 0;
  xpTotal += valor;

  let nivel = 1;
  let xpAcumulada = xpTotal;

  while (true) {
    const xpParaSubir = this.xpParaProximoNivel(nivel);
    if (xpAcumulada >= xpParaSubir) {
      xpAcumulada -= xpParaSubir;
      nivel++;
    } else {
      break;
    }
  }

  await updateDoc(userRef, {
    xp: xpTotal,     // XP total acumulada
    nivel: nivel     // Nível corretamente ajustado
  });

  console.log(`[🔥] XP global atualizada: XP = ${xpTotal}, Nível = ${nivel}`);
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
    await this.adicionarXPNoDia(xp);
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
      await this.adicionarXPNoDia(xp);
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
    await this.adicionarXPNoDia(xpDelta);
    await this.atualizarXPGlobal(xpDelta);
  }
}


async carregarQuestsDoDia(): Promise<{
  dailyQuests: QuestInstance[],
  weeklyQuests: QuestInstance[],
  dailyHuntingQuests: QuestInstance[],
  weeklyHuntingQuests: QuestInstance[]
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

  agendarExpiracao(quest: QuestInstance, tipo: 'dailyHunting' | 'weeklyHunting') {
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

verificarExpiradas(quests: QuestInstance[]): QuestInstance[] {
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

async marcarComoExpiradaNoFirestore(quest: QuestInstance) {
  const ref = await this.getDiaDocRef(this.dataHoje());
  const snap = await getDoc(ref);
  const data = snap.data() as DiaData;

  const key = quest.categoria === 'daily' ? 'dailyQuests' :
              quest.categoria === 'weekly' ? 'weeklyQuests' :
              quest.categoria === 'dailyHunting' ? 'dailyHuntingQuests' :
              'weeklyHuntingQuests';

  const updatedList = (data[key] ?? []).map((q: QuestInstance) =>
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
