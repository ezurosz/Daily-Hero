import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  DocumentReference,
  docData,
} from '@angular/fire/firestore';
import { AuthService } from '../../auth/auth.service';
import { Attrs, AttrKey, Attr } from '../models/atributos.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AtributosService {
  constructor(private firestore: Firestore, private auth: AuthService) {}

  // =============== Helpers ===============
  private clamp(n: number, lo = 0, hi = 100) { return Math.min(hi, Math.max(lo, n)); }
  private nowISO() { return new Date().toISOString(); }
  private defAttr(v = 40, f = 20): Attr { return { value: v, floor: f, lastUpdated: this.nowISO() }; }

  private ensureAttrShape(a: any): Attrs {
    return {
      forca:        a?.forca        ?? this.defAttr(),
      inteligencia: a?.inteligencia ?? this.defAttr(),
      socializacao: a?.socializacao ?? this.defAttr(),
      disciplina:   a?.disciplina   ?? this.defAttr(),
      consciencia:  a?.consciencia  ?? this.defAttr(),
      fe:           a?.fe           ?? this.defAttr(),
    };
  }

  private applyAttrDelta(attr: Attr, delta: number): Attr {
    const next = this.clamp(attr.value + delta, 0, 100);
    return { ...attr, value: Math.max(attr.floor, next), lastUpdated: this.nowISO() };
  }

  private getUserRef(): DocumentReference {
    const uid = this.auth.getUid(); // ✅ síncrono
    if (!uid) throw new Error('Usuário não autenticado (chame waitForAuthReady() no boot).');
    return doc(this.firestore, `users/${uid}`);
  }

  // =============== Leitura (one-shot e realtime) ===============

  /** One-shot: lê os atributos atuais do Firestore e normaliza o shape */
  async getAttributes(): Promise<Attrs> {
    const userRef = this.getUserRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    return this.ensureAttrShape(data['attributes']);
  }

  /** Realtime: stream dos atributos normalizados (users/{uid}.attributes) */
  attributes$(): Observable<Attrs> {
    const userRef = this.getUserRef();
    return docData(userRef).pipe(
      map((u: any) => this.ensureAttrShape(u?.attributes))
    );
  }

  // =============== Inicialização ===============

  /** Garante o bloco attributes no users/{uid} */
  async ensureAttributes(): Promise<void> {
    const userRef = this.getUserRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    if (data['attributes']) return;

    await updateDoc(userRef, { attributes: this.ensureAttrShape({}) });
    console.log('[✅ atributos] inicializados no usuário');
  }

  // =============== Atualizações por evento ===============

  /**
   * Aplica deltas nos 6 atributos com base em um evento.
   * - tipo 'treino'      → Força +2, Disciplina +1
   * - tipo 'refeicao'    → Disciplina +0.5
   * - tipo 'agua'        → Disciplina +0.5
   * - tipo 'quest' (tags):
   *    - 'social'                   → Socialização +2
   *    - 'estudo'|'conhecimento'    → Inteligência +2
   *    - 'fé'|'fe'                  → Fé +2
   *    - 'auto-reflex'              → Consciência +2
   *   (toda quest concluída também dá Disciplina +0.5)
   */
  async aplicarAtributosPorEvento(opts: {
    tipo: 'treino' | 'refeicao' | 'agua' | 'quest';
    concluindo: boolean;     // true ao concluir/ligar; false ao desfazer
    tags?: string[];         // só para quests
  }): Promise<void> {
    const sign = opts.concluindo ? +1 : -1;

    const userRef = this.getUserRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    const attrs = this.ensureAttrShape(data['attributes']);

    // acumula deltas por atributo
    const delta: Partial<Record<AttrKey, number>> = {};

    if (opts.tipo === 'treino') {
      delta.forca      = (delta.forca ?? 0) + 2 * sign;
      delta.disciplina = (delta.disciplina ?? 0) + 1 * sign;
    }

    if (opts.tipo === 'refeicao' || opts.tipo === 'agua') {
      delta.disciplina = (delta.disciplina ?? 0) + 0.5 * sign;
    }

    if (opts.tipo === 'quest') {
      for (const raw of (opts.tags ?? [])) {
        const t = raw.toLowerCase();
        if (t.includes('social'))                               delta.socializacao = (delta.socializacao ?? 0) + 2 * sign;
        if (t.includes('estudo') || t.includes('conhecimento')) delta.inteligencia = (delta.inteligencia ?? 0) + 2 * sign;
        if (t === 'fé' || t === 'fe')                           delta.fe           = (delta.fe ?? 0) + 2 * sign;
        if (t.includes('auto-reflex'))                          delta.consciencia  = (delta.consciencia ?? 0) + 2 * sign;
      }
      // toda quest concluída reforça um pouco a disciplina
      delta.disciplina = (delta.disciplina ?? 0) + 0.5 * sign;
    }

    // aplica os deltas calculados
    const updated: Attrs = { ...attrs };
    (Object.keys(delta) as AttrKey[]).forEach((k) => {
      updated[k] = this.applyAttrDelta(updated[k], delta[k]!);
    });

    await updateDoc(userRef, { attributes: updated });
    console.log('[✨ atributos] atualizados por evento', { tipo: opts.tipo, delta });
  }
}
