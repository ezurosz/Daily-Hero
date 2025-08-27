// ==========================
// FILE: app/missions/missions.service.ts
// (Service com métodos usados pela tela missoes.html)
// ==========================
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, setDoc, collection, getDocs, addDoc, deleteDoc } from '@angular/fire/firestore';
import { FixedQuestTemplate } from '../../../core/models/fixed-quest-template.model';
import { QuestInstance } from '../../../core/models/quest-instance.model';
import { HuntingTemplate } from '../../../core/models/hunting-template';

@Injectable({ providedIn: 'root' })
export class MissoesService {
  private afs = inject(Firestore);
  private auth = inject(Auth);

  // ===== Utils =====
  private async uid(): Promise<string> {
    if (this.auth.currentUser) return this.auth.currentUser.uid;
    const user = await new Promise<import('firebase/auth').User | null>((resolve) => {
      const unsub = this.auth.onAuthStateChanged((u) => { unsub(); resolve(u); });
    });
    if (!user) throw new Error('Usuário não autenticado');
    return user.uid;
  }
  private pad(n: number) { return n < 10 ? '0' + n : '' + n; }
  todayKey(d = new Date()) { return `${d.getFullYear()}-${this.pad(d.getMonth()+1)}-${this.pad(d.getDate())}`; }
  private async dayDocPath(dateKey: string) { return `users/${await this.uid()}/dias/${dateKey}`; }

  // ===== FIXED QUESTS (root do usuário) =====
  // Estrutura assumida: users/{uid}.fixedQuests = { daily: FixedQuestTemplate[], weekly: FixedQuestTemplate[] }
  async listFixedQuests(): Promise<{ daily: FixedQuestTemplate[]; weekly: FixedQuestTemplate[] }>{
    const userRef = doc(this.afs, `users/${await this.uid()}`);
    const snap = await getDoc(userRef);
    const data = (snap.data() ?? {}) as any;
    return {
      daily: (data.fixedQuests?.daily ?? []) as FixedQuestTemplate[],
      weekly: (data.fixedQuests?.weekly ?? []) as FixedQuestTemplate[],
    };
  }

  async upsertFixedQuest(q: Partial<FixedQuestTemplate> & { descricao: string; categoria: 'daily'|'weekly' }): Promise<FixedQuestTemplate> {
    const userRef = doc(this.afs, `users/${await this.uid()}`);
    const snap = await getDoc(userRef);
    const data = (snap.data() ?? {}) as any;

    const bucket: FixedQuestTemplate[] = (data.fixedQuests?.[q.categoria] ?? []) as FixedQuestTemplate[];
    const id = q.id ?? crypto.randomUUID();
    const novo: FixedQuestTemplate = {
      id,
      descricao: q.descricao,
      categoria: q.categoria,
      // campos livres, pois você não usa tipos fechados:
      level: (q as any).level ?? 'fácil',
      tags: (q as any).tags ?? [],
      fixa: true as any,           // manter compat se seu modelo tiver esse campo
      ativa: (q as any).ativa ?? true,
      rev: (q as any).rev ?? 1,
      instanciar: true
    } as FixedQuestTemplate;

    const idx = bucket.findIndex(b => b.id === id);
    if (idx >= 0) bucket[idx] = { ...bucket[idx], ...novo } as FixedQuestTemplate;
    else bucket.push(novo);

    const fixedQuests = {
      daily: q.categoria === 'daily' ? bucket : (data.fixedQuests?.daily ?? []),
      weekly: q.categoria === 'weekly' ? bucket : (data.fixedQuests?.weekly ?? []),
    };

    await setDoc(userRef, { fixedQuests }, { merge: true });
    return novo;
  }

  async deleteFixedQuest(id: string, categoria: 'daily'|'weekly'): Promise<void> {
    const userRef = doc(this.afs, `users/${await this.uid()}`);
    const snap = await getDoc(userRef);
    const data = (snap.data() ?? {}) as any;
    const bucket: FixedQuestTemplate[] = (data.fixedQuests?.[categoria] ?? []) as FixedQuestTemplate[];
    const filtered = bucket.filter(b => b.id !== id);
    const fixedQuests = {
      daily: categoria === 'daily' ? filtered : (data.fixedQuests?.daily ?? []),
      weekly: categoria === 'weekly' ? filtered : (data.fixedQuests?.weekly ?? []),
    };
    await setDoc(userRef, { fixedQuests }, { merge: true });
  }

  // ===== HUNTINGS (por dia) =====
  // Coleção: users/{uid}/dias/{YYYY-MM-DD}/huntingQuests
  async listHuntingQuests(dateKey: string): Promise<HuntingTemplate[]> {
    const colRef = collection(this.afs, `${await this.dayDocPath(dateKey)}/huntingQuests`);
    const qs = await getDocs(colRef);
    return qs.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }
  async addHuntingQuest(dateKey: string, q: Omit<HuntingTemplate,'id'|'createdAt'|'concluida'>): Promise<HuntingTemplate> {
    const colRef = collection(this.afs, `${await this.dayDocPath(dateKey)}/huntingQuests`);
    const docRef = await addDoc(colRef, { ...q, createdAt: Date.now(), concluida: false });
    return { id: docRef.id, ...q, createdAt: Date.now(), concluida: false } as any;
  }
  async updateHuntingQuest(dateKey: string, q: HuntingTemplate): Promise<void> {
    const ref = doc(this.afs, `${await this.dayDocPath(dateKey)}/huntingQuests/${q.id}`);
    await setDoc(ref, q as any, { merge: true });
  }
  async deleteHuntingQuest(dateKey: string, id: string): Promise<void> {
    const ref = doc(this.afs, `${await this.dayDocPath(dateKey)}/huntingQuests/${id}`);
    await deleteDoc(ref);
  }

  // ===== INSTÂNCIAS DE FIXAS (por dia) =====
  // Coleções: fixedInstances_daily e fixedInstances_weekly
  async ensureFixedInstances(dateKey: string): Promise<void> {
    const { daily, weekly } = await this.listFixedQuests();
    const base = await this.dayDocPath(dateKey);
    await setDoc(doc(this.afs, base), { createdAt: Date.now() }, { merge: true });

    const ensureBucket = async (bucket: 'daily'|'weekly', list: FixedQuestTemplate[]) => {
      const colRef = collection(this.afs, `${base}/fixedInstances_${bucket}`);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        for (const f of list) {
          await addDoc(colRef, this.mkInstanceFromFixed(f, dateKey));
        }
      }
    };

    await ensureBucket('daily', daily);
    await ensureBucket('weekly', weekly);
  }

  async listFixedInstances(dateKey: string): Promise<{ daily: QuestInstance[]; weekly: QuestInstance[] }>{
    const base = await this.dayDocPath(dateKey);
    const dRef = collection(this.afs, `${base}/fixedInstances_daily`);
    const wRef = collection(this.afs, `${base}/fixedInstances_weekly`);
    const [dSnap, wSnap] = await Promise.all([getDocs(dRef), getDocs(wRef)]);
    return {
      daily: dSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
      weekly: wSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })),
    };
  }

  async updateFixedInstance(dateKey: string, bucket: 'daily'|'weekly', inst: QuestInstance): Promise<void> {
    const ref = doc(this.afs, `${await this.dayDocPath(dateKey)}/fixedInstances_${bucket}/${inst.id}`);
    await setDoc(ref, inst as any, { merge: true });
  }

  private mkInstanceFromFixed(f: FixedQuestTemplate, dateKey: string): Omit<QuestInstance,'id'> {
    const parseKey = (k: string) => { const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); };
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    const today = parseKey(dateKey);

    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7));

    return {
      fixedId: (f as any).id,
      descricao: (f as any).descricao,
      categoria: (f as any).categoria,  // mantido livre (string)
      level: (f as any).level ?? 'fácil',
      tags: (f as any).tags ?? [],
      concluida: false,
      vencimento: ((f as any).categoria === 'daily') ? endOfDay(today) : endOfDay(nextSunday),
      createdAt: Date.now(),
    } as any;
  }
}
