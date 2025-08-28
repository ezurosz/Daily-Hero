// src/app/core/services/firebase/real-time.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { map, switchMap, filter, tap } from 'rxjs/operators';
import { user } from 'rxfire/auth';

import { FixedQuestTemplate } from '../../models/fixed-quest-template.model';
import { HuntingTemplate } from '../../models/hunting-template';
import { QuestInstance } from '../../models/quest-instance.model';

type DiaDoc = {
  id?: string;
  fixedQuests?: QuestInstance[];
  huntingQuests?: HuntingTemplate[];
  // ... outros campos do dia
};

@Injectable({ providedIn: 'root' })
export class RealTimeService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  private async uid(): Promise<string> {
    const u = await firstValueFrom(user(this.auth));
    if (!u) throw new Error('Usuário não autenticado');
    return u.uid;
  }

  dataHoje(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  }

  /** Expira ao fim do dia local do `vencimento` (23:59:59.999 America/Sao_Paulo) */
  private shouldBeExpired(q: { vencimento?: any; concluida?: boolean }): boolean {
    if (!q?.vencimento || q.concluida) return false;

    const due =
      q.vencimento instanceof Timestamp
        ? q.vencimento.toDate()
        : (q.vencimento instanceof Date ? q.vencimento : new Date(q.vencimento));

    const end = new Date(due);
    end.setHours(23, 59, 59, 999);
    return Date.now() > end.getTime();
  }

  // -----------------------------
  // Streams principais
  // -----------------------------

  readonly userDoc$: Observable<any> = user(this.auth).pipe(
    filter((u: any) => !!u),
    map(u => doc(this.firestore, `users/${u!.uid}`)),
    switchMap(ref => docData(ref, { idField: 'id' }))
  );

  dayDoc$(date = this.dataHoje()): Observable<DiaDoc | undefined> {
    return user(this.auth).pipe(
      filter((u: any) => !!u),
      map(u => doc(this.firestore, `users/${u!.uid}/dias/${date}`)),
      switchMap(ref => docData(ref, { idField: 'id' }) as Observable<DiaDoc | undefined>)
    );
  }

  // -----------------------------
  // Catálogos (users/{uid})
  // -----------------------------

  readonly fixedCatalog$: Observable<FixedQuestTemplate[]> = this.userDoc$.pipe(
    map((data: any) => {
      const root = data?.fixedQuests;
      if (Array.isArray(root)) return root as FixedQuestTemplate[];
      const daily  = (root?.daily  ?? []) as FixedQuestTemplate[];
      const weekly = (root?.weekly ?? []) as FixedQuestTemplate[];
      return [...daily, ...weekly];
    })
  );

  readonly huntingCatalog$: Observable<HuntingTemplate[]> = this.userDoc$.pipe(
    map((data: any) => (data?.huntingQuests ?? []) as HuntingTemplate[])
  );

  workoutList$(): Observable<string[]> {
    return this.userDoc$.pipe(
      map((data: any) => (data?.workoutList ?? []) as string[])
    );
  }

  // -----------------------------
  // Instâncias do dia (users/{uid}/dias/{date})
  // -----------------------------

  /** Corrige no Firestore as expirações que já deveriam estar true */
  private async ensureExpirationsPersisted(date: string, dia: DiaDoc | undefined): Promise<void> {
    if (!dia) return;

    const uid = await this.uid();
    const dayRef = doc(this.firestore, `users/${uid}/dias/${date}`);

    let needsUpdate = false;

    const fix = (arr: any[] | undefined) => {
      if (!Array.isArray(arr)) return arr;
      const next = arr.map(item => {
        const should = this.shouldBeExpired(item);
        if (should && !item.expirado) {
          needsUpdate = true;
          return { ...item, expirado: true };
        }
        return item;
      });
      return next;
    };

    const fixedQuestsNext   = fix(dia.fixedQuests);
    const huntingQuestsNext = fix(dia.huntingQuests);

    if (needsUpdate) {
      await updateDoc(dayRef, {
        ...(fixedQuestsNext   ? { fixedQuests: fixedQuestsNext }     : {}),
        ...(huntingQuestsNext ? { huntingQuests: huntingQuestsNext } : {}),
      });
    }
  }

  /** Instâncias FIXED do dia (sem decoração; usa o valor do Firestore) */
  fixedInstances$(date = this.dataHoje()): Observable<QuestInstance[]> {
    return this.dayDoc$(date).pipe(
      tap(dia => { void this.ensureExpirationsPersisted(date, dia); }), // 👈 persiste se necessário
      map(dia => (dia?.fixedQuests ?? []) as QuestInstance[])
    );
  }

  /** Instâncias HUNTING do dia (sem decoração; usa o valor do Firestore) */
  huntingInstances$(date = this.dataHoje()): Observable<HuntingTemplate[]> {
    return this.dayDoc$(date).pipe(
      tap(dia => { void this.ensureExpirationsPersisted(date, dia); }), // 👈 persiste se necessário
      map(dia => (dia?.huntingQuests ?? []) as HuntingTemplate[])
    );
  }

  // -----------------------------
  // (opcional) Signals prontos
  // -----------------------------
  fixedCatalogSig     = signal<FixedQuestTemplate[]>([]);
  huntingCatalogSig   = signal<HuntingTemplate[]>([]);
  fixedInstancesSig   = signal<QuestInstance[]>([]);
  huntingInstancesSig = signal<HuntingTemplate[]>([]);
}
