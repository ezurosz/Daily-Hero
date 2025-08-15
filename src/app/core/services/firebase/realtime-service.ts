// src/app/core/services/firebase/real-time.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { of, firstValueFrom } from 'rxjs';
import { map, switchMap, filter } from 'rxjs/operators';
import { user } from 'rxfire/auth';

import { FixedQuestTemplate } from '../../models/fixed-quest-template.model';
import { HuntingTemplate } from '../../models/hunting-template';
import { QuestInstance } from '../../models/quest-instance.model';

@Injectable({ providedIn: 'root' })
export class RealTimeService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // helper: pega UID 1x (para usos ocasionais/imperativos)
  private async uid(): Promise<string> {
    const u = await firstValueFrom(user(this.auth));
    if (!u) throw new Error('Usuário não autenticado');
    return u.uid;
  }

  // helper: data local YYYY-MM-DD (subcoleção /dias/{date})
  dataHoje(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  }

  // -----------------------------
  // Streams principais (Observables)
  // -----------------------------

  /** Stream do documento principal do usuário (users/{uid}) */
  userDoc$ = user(this.auth).pipe(
    filter((u: any) => !!u),
    map(u => doc(this.firestore, `users/${u!.uid}`)),
    switchMap(ref => docData(ref, { idField: 'id' }))
  );

  /** Stream do documento do dia atual (users/{uid}/dias/{date}) */
  dayDoc$(date = this.dataHoje()) {
    return user(this.auth).pipe(
      filter((u: any) => !!u),
      map(u => doc(this.firestore, `users/${u!.uid}/dias/${date}`)),
      switchMap(ref => docData(ref, { idField: 'id' }))
    );
  }

  // -----------------------------
  // Projeções do CATÁLOGO (users/{uid})
  // -----------------------------

  /** Catálogo de Fixas (array unificado em users/{uid}.fixedQuests) */
  fixedCatalog$ = this.userDoc$.pipe(
    map((data: any) => {
      const root = data?.fixedQuests;
      if (Array.isArray(root)) return root as FixedQuestTemplate[];
      const daily  = (root?.daily  ?? []) as FixedQuestTemplate[];
      const weekly = (root?.weekly ?? []) as FixedQuestTemplate[];
      return [...daily, ...weekly];
    })
  );

  /** Catálogo de Huntings (users/{uid}.huntingQuests) */
  huntingCatalog$ = this.userDoc$.pipe(
    map((data: any) => (data?.huntingQuests ?? []) as HuntingTemplate[])
  );

  /** 🔴 Lista de nomes de treinos em tempo real (users/{uid}.workoutList) */
  workoutList$() {
    return this.userDoc$.pipe(
      map((data: any) => (data?.workoutList ?? []) as string[])
    );
  }

  // -----------------------------
  // Projeções das INSTÂNCIAS do DIA (users/{uid}/dias/{date})
  // -----------------------------

  /** Instâncias fixas do dia (users/{uid}/dias/{date}.fixedQuests) */
  fixedInstances$(date = this.dataHoje()) {
    return this.dayDoc$(date).pipe(
      map((dia: any) => (dia?.fixedQuests ?? []) as QuestInstance[])
    );
  }

  /** Instâncias de hunting do dia (users/{uid}/dias/{date}.huntingQuests) */
  huntingInstances$(date = this.dataHoje()) {
    return this.dayDoc$(date).pipe(
      map((dia: any) => (dia?.huntingQuests ?? []) as HuntingTemplate[])
    );
  }

  // -----------------------------
  // (opcional) Signals prontos para template
  // -----------------------------
  fixedCatalogSig   = signal<FixedQuestTemplate[]>([]);
  huntingCatalogSig = signal<HuntingTemplate[]>([]);
  fixedInstancesSig = signal<QuestInstance[]>([]);
  huntingInstancesSig = signal<HuntingTemplate[]>([]);
}
