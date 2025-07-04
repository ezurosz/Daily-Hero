import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Quest } from '../../models/quest.model';
import { firstValueFrom } from 'rxjs';
import { user } from 'rxfire/auth';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  async initUserDataIfNeeded() {
    const user = this.auth.currentUser;
    if (!user) return;

    const userRef = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        nivel: 1,
        xp: 0,
        quests: {
          daily: [] as Quest[],
          weekly: [] as Quest[]
        },
        waterIntake: {},
        meals: {},
        workouts: {},
        workoutList: [],
        xpHistory: {
          lastEntry: null
        }
      });
      console.log('[Firestore] Novo usuário inicializado.');
    } else {
      console.log('[Firestore] Dados do usuário já existem.');
    }
  }

  async getUserDocRef() {
    const userData = await firstValueFrom(user(this.auth));
    if (!userData) throw new Error('Usuário não autenticado');
    return doc(this.firestore, 'users', userData.uid);
  }

  async updateUserField(path: string, value: any) {
    const ref = await this.getUserDocRef();
    await updateDoc(ref, { [path]: value });
  }

  async updateXP(xp: number, nivel: number) {
    const ref = await this.getUserDocRef();
    await updateDoc(ref, { xp, nivel });
  }

  async setWorkoutForToday(nome: string) {
    const hoje = new Date().toISOString().split('T')[0];
    const ref = await this.getUserDocRef();
    await updateDoc(ref, {
      [`workouts.${hoje}`]: nome
    });
  }

  async setWaterToday(litros: number) {
    const hoje = new Date().toISOString().split('T')[0];
    const ref = await this.getUserDocRef();
    await updateDoc(ref, {
      [`waterIntake.${hoje}`]: litros
    });
  }

  async setMeal(nome: string, feita: boolean) {
    const ref = await this.getUserDocRef();
    await updateDoc(ref, {
      [`meals.${nome}`]: feita
    });
  }

  // ✅ Toggle conclusão de uma quest sem sobrescrever tudo
  async toggleQuestConcluida(id: string, categoria: 'daily' | 'weekly', novaConclusao: boolean) {
    const ref = await this.getUserDocRef();
    const snapshot = await getDoc(ref);
    const data = snapshot.data();

    if (!data?.['quests']?.[categoria]) {
  throw new Error(`Nenhuma lista encontrada para categoria ${categoria}`);
}

const questsAtualizadas = data['quests'][categoria].map((q: any) =>
  q.id === id ? { ...q, concluida: novaConclusao } : q
);


    await updateDoc(ref, {
      [`quests.${categoria}`]: questsAtualizadas
    });

    console.log(`✅ Quest ${id} atualizada para concluida = ${novaConclusao}`);
  }

  // ✅ Adicionar dailies padrão
  async addDefaultDailies() {
    const ref = await this.getUserDocRef();

    const novas: Quest[] = [
      {
        id: crypto.randomUUID(),
        descricao: 'Ler 10 páginas de um livro',
        concluida: false,
        categoria: 'daily',
        level: 'médio',
        ultimoCheck: null
      },
      {
        id: crypto.randomUUID(),
        descricao: 'Meditar por 10 minutos',
        concluida: false,
        categoria: 'daily',
        level: 'fácil',
        ultimoCheck: null
      },
      {
        id: crypto.randomUUID(),
        descricao: 'Tomar 2L de água',
        concluida: false,
        categoria: 'daily',
        level: 'médio',
        ultimoCheck: null
      }
    ];

    const snapshot = await getDoc(ref);
    const data = snapshot.data() ?? {};
    const quests = (data['quests'] ?? {}) as { daily: Quest[] };
    const dailyQuests = quests.daily ?? [];

    await updateDoc(ref, {
      'quests.daily': [...dailyQuests, ...novas]
    });

    console.log('[Firestore] Dailies padrão adicionadas.');
  }

  // ✅ Adicionar weeklies padrão
  async addDefaultWeeklies() {
    const ref = await this.getUserDocRef();

    const novas: Quest[] = [
      {
        id: crypto.randomUUID(),
        descricao: 'Fazer 4 treinos na semana',
        concluida: false,
        categoria: 'weekly',
        level: 'difícil',
        ultimoCheck: null
      },
      {
        id: crypto.randomUUID(),
        descricao: 'Evitar açúcar por 5 dias',
        concluida: false,
        categoria: 'weekly',
        level: 'médio',
        ultimoCheck: null
      },
      {
        id: crypto.randomUUID(),
        descricao: 'Ler 50 páginas de um livro',
        concluida: false,
        categoria: 'weekly',
        level: 'médio',
        ultimoCheck: null
      }
    ];

    const snapshot = await getDoc(ref);
    const data = snapshot.data() ?? {};
    const quests = (data['quests'] ?? {}) as { weekly: Quest[] };
    const weeklyQuests = quests.weekly ?? [];

    await updateDoc(ref, {
      'quests.weekly': [...weeklyQuests, ...novas]
    });

    console.log('[Firestore] Weeklies padrão adicionadas.');
  }

  async getUserData() {
    const ref = await this.getUserDocRef();
    const snapshot = await getDoc(ref);
    return snapshot.data();
  }
}
