// src/app/core/services/codex.service.ts
import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, query, orderBy, limit,
  getDocs, deleteDoc, getCountFromServer
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { user } from 'rxfire/auth';

import {
  CodexBlock,
  CodexEntry,
  CodexFlags
} from '../models/codex.model';

@Injectable({ providedIn: 'root' })
export class CodexService {
  private fs = inject(Firestore);
  private auth = inject(Auth);

  // ======= Helpers de tempo/zone =======
  private readonly tz = 'America/Fortaleza';

  /** ISO UTC como nas quests (ex.: 2025-08-28T23:13:26.424Z) */
  private nowIso(): string {
    return new Date().toISOString();
  }

  /** YYYY-MM-DD do dia em America/Fortaleza (para agrupar por dia local) */
  private todayKey(date = new Date()): string {
    // Usa Intl para obter partes na TZ desejada
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const y = parts.find(p => p.type === 'year')?.value ?? '0000';
    const m = parts.find(p => p.type === 'month')?.value ?? '01';
    const d = parts.find(p => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  }

  private async uid(): Promise<string> {
    const u = await firstValueFrom(user(this.auth));
    if (!u) throw new Error('Usuário não autenticado');
    return u.uid;
  }

  // ========= REFLEXÃO (campos no DOC do dia) =========

  /** Lê a reflexão do dia (campos no doc do dia) */
  async getReflexaoHoje(dateKey = this.todayKey()) {
    const uid = await this.uid();
    const diaRef = doc(this.fs, `users/${uid}/dias/${dateKey}`);
    const snap = await getDoc(diaRef);
    const data = snap.data() as any;
    return {
      text: data?.reflexaoText ?? '',
      updatedAt: data?.reflexaoUpdatedAt ?? null as string | null,
    };
  }

  /** Upsert da reflexão no doc do dia + marca Consciência 1x/dia */
  async upsertReflexaoHoje(text: string, dateKey = this.todayKey()) {
  const uid = await this.uid();
  const now = this.nowIso();
  const diaRef = doc(this.fs, `users/${uid}/dias/${dateKey}`);

  await setDoc(
    diaRef,
    { reflexaoText: text, reflexaoUpdatedAt: now },
    { merge: true }
  );

  await this.ensureDailyConscienciaPoint(dateKey);
}

  // ========= BLOCOS (nota única com autosave) =========

  /** Cria um novo bloco (nota) e retorna o id */
  async createBlock(title: string): Promise<string> {
  const uid = await this.uid();
  const blocksCol = collection(this.fs, `users/${uid}/codexBlocks`);
  const now = this.nowIso();
  const ref = await addDoc(blocksCol, {
    title,
    createdAt: now,
    updatedAt: now,
    contentHtml: '',
    contentUpdatedAt: now,
  } as Omit<CodexBlock, 'id'> & { contentHtml: string; contentUpdatedAt: string });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

  /** Atualiza o título do bloco */
  async renameBlock(blockId: string, newTitle: string): Promise<void> {
    const uid = await this.uid();
    const ref = doc(this.fs, `users/${uid}/codexBlocks/${blockId}`);
    await updateDoc(ref, { title: newTitle, updatedAt: this.nowIso() });
  }

  /** Lê o conteúdo HTML do bloco (campo contentHtml do próprio doc) */
  async getBlockContent(blockId: string): Promise<string> {
    const uid = await this.uid();
    const snap = await getDoc(doc(this.fs, `users/${uid}/codexBlocks/${blockId}`));
    const data = snap.data() as any;
    return data?.contentHtml ?? '';
  }

  /** Upsert do conteúdo HTML no doc do bloco + atualiza updatedAt + marca Inteligência 1x/dia */
  async upsertBlockContent(blockId: string, html: string): Promise<void> {
  const uid = await this.uid();
  const ref = doc(this.fs, `users/${uid}/codexBlocks/${blockId}`);
  const now = this.nowIso();

  // lê para preservar/recuperar createdAt
  const snap = await getDoc(ref);
  const cur = (snap.exists() ? (snap.data() as any) : {}) || {};
  const createdAt: string = typeof cur.createdAt === 'string' ? cur.createdAt : now;

  await setDoc(
    ref,
    {
      contentHtml: html,
      contentUpdatedAt: now,
      updatedAt: now,
      createdAt, // garante presença
    },
    { merge: true }
  );

  await this.ensureDailyInteligenciaPoint();
}

  /**
   * Deleta um bloco (limpa subcoleção entries se existir — legado)
   */
  async deleteBlock(blockId: string): Promise<void> {
    const uid = await this.uid();

    // limpeza de legados (se a subcoleção entries existir)
    const entriesColPath = `users/${uid}/codexBlocks/${blockId}/entries`;
    try {
      let fetched = 0;
      do {
        const snap = await getDocs(query(collection(this.fs, entriesColPath), limit(50)));
        fetched = snap.size;
        const deletions = snap.docs.map(d => deleteDoc(d.ref));
        if (deletions.length) await Promise.all(deletions);
      } while (fetched === 50);
    } catch {
      // se não existir a subcoleção, ignoramos
    }

    // apaga o documento do bloco
    const blockRef = doc(this.fs, `users/${uid}/codexBlocks/${blockId}`);
    await deleteDoc(blockRef);
  }

  /** Lista blocos ordenados por atividade (updatedAt desc) */
  async listBlocks(limitCount = 50) {
    const uid = await this.uid();
    const q = query(
      collection(this.fs, `users/${uid}/codexBlocks`),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    return await getDocs(q);
  }

  /** Obtém um bloco específico (doc) */
  async getBlock(blockId: string) {
    const uid = await this.uid();
    return await getDoc(doc(this.fs, `users/${uid}/codexBlocks/${blockId}`));
  }

  /** (Opcional) contagem de “entries” legadas — pode remover quando não houver mais */
  async countEntries(blockId: string): Promise<number> {
    const uid = await this.uid();
    const col = collection(this.fs, `users/${uid}/codexBlocks/${blockId}/entries`);
    try {
      const snapshot = await getCountFromServer(col);
      return snapshot.data().count;
    } catch {
      return 0;
    }
  }

  // ========= PONTUAÇÃO DIÁRIA (flags em users/{uid}/dias/{YYYY-MM-DD}) =========

  /** Marca +Inteligência 1x/dia ao interagir com blocos */
  private async ensureDailyInteligenciaPoint(dateKey = this.todayKey()) {
    const uid = await this.uid();
    const diaRef = doc(this.fs, `users/${uid}/dias/${dateKey}`);
    const snap = await getDoc(diaRef);
    const flags = (snap.data()?.['codexFlags'] ?? {}) as CodexFlags;

    if (!flags?.inteligencia) {
      await setDoc(
        diaRef,
        { codexFlags: { ...(flags || {}), inteligencia: true } },
        { merge: true }
      );
    }
  }

  /** Marca +Consciência 1x/dia ao salvar reflexão do dia */
  private async ensureDailyConscienciaPoint(dateKey = this.todayKey()) {
    const uid = await this.uid();
    const diaRef = doc(this.fs, `users/${uid}/dias/${dateKey}`);
    const snap = await getDoc(diaRef);
    const flags = (snap.data()?.['codexFlags'] ?? {}) as CodexFlags;

    if (!flags?.consciencia) {
      await setDoc(
        diaRef,
        { codexFlags: { ...(flags || {}), consciencia: true } },
        { merge: true }
      );
    }
  }

  // ========= (Opcional) MIGRAÇÃO number -> ISO =========
  /**
   * Converte campos numéricos de timestamp (createdAt/updatedAt/contentUpdatedAt/reflexaoUpdatedAt)
   * para ISO-8601 Z. Rode uma vez se você já tiver dados antigos.
   */
}
