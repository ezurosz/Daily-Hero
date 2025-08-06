import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from '@angular/fire/firestore';
import { AuthService } from '../../auth/auth.service';
import { Treino, Exercicio, Serie } from '../../core/models/treino.model';

@Component({
  selector: 'app-editar-treino',
  standalone: true,
  templateUrl: './editar-treino.html',
  styleUrls: ['./editar-treino.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatIconModule
  ],
})
export class EditarTreinoPage implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  treino: Treino = { nome: '', exercicios: [] };
  sugestoes: { reps: number; carga: number }[][] = [];
  novoExercicio: Exercicio = { nome: '', series: [] };
  private uid: string = '';

  async ngOnInit() {
    this.uid = await this.esperarUsuario();
    const nome = this.route.snapshot.paramMap.get('nome');
    if (!nome) return;

    const userRef = doc(this.firestore, `users/${this.uid}`);
    const userSnap = await getDoc(userRef);
    const treinos = (userSnap.data()?.['treinos'] ?? []) as Treino[];
    const treinoEncontrado = treinos.find(t => t.nome === nome);
    if (!treinoEncontrado) return;

    this.treino = JSON.parse(JSON.stringify(treinoEncontrado));

    const diaRef = await this.getDiaDataRef();
    const diaSnap = await getDoc(diaRef);
    if (diaSnap.exists() && diaSnap.data()?.['treinos']?.[nome]) {
      await this.sincronizarTreinoDoDiaComBase();
    }

    await this.carregarSugestoes(nome);
  }

  private async esperarUsuario(): Promise<string> {
    let tentativas = 0;
    let uid = this.authService.getCurrentUser()?.uid;
    while (!uid && tentativas < 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      uid = this.authService.getCurrentUser()?.uid;
      tentativas++;
    }
    if (!uid) throw new Error('Usuário não autenticado');
    return uid;
  }

  private async getDiaDataRef() {
    const hoje = this.getHoje();
    return doc(this.firestore, `users/${this.uid}/dias/${hoje}`);
  }

  private getHoje(): string {
    const agora = new Date();
    const offset = -3;
    agora.setHours(agora.getHours() + offset);
    return agora.toISOString().split('T')[0];
  }

  private async sincronizarTreinoDoDiaComBase() {
    const diaRef = await this.getDiaDataRef();
    const snap = await getDoc(diaRef);
    if (!snap.exists()) return;

    const diaData = snap.data();
    const treinoDia = diaData?.['treinos']?.[this.treino.nome];
    if (!treinoDia) return;

    const estruturaAtualizada = this.treino.exercicios.map((baseExercicio, i) => {
      const exercicioDoDia = treinoDia.exercicios?.find((e: Exercicio) => e.nome === baseExercicio.nome);
      const seriesAtualizadas = baseExercicio.series.map((_, idx) => {
        return exercicioDoDia?.series?.[idx] ?? { reps: 0, carga: 0 };
      });
      return {
        nome: baseExercicio.nome,
        series: seriesAtualizadas
      };
    });

    await updateDoc(diaRef, {
      [`treinos.${this.treino.nome}.exercicios`]: estruturaAtualizada
    });
  }

  private montarEstruturaDoTreinoParaHoje(): { nome: string, exercicios: Exercicio[] } {
    return {
      nome: this.treino.nome,
      exercicios: this.treino.exercicios.map(ex => ({
        nome: ex.nome,
        series: ex.series.map(() => ({ reps: 0, carga: 0 }))
      }))
    };
  }

  async salvarSerie(exercicioIndex: number, serieIndex: number) {
    const diaRef = await this.getDiaDataRef();
    const snap = await getDoc(diaRef);
    let dataDia = snap.exists() ? snap.data() : {};

    if (!dataDia['treinos']) dataDia['treinos'] = {};
    if (!dataDia['treinos'][this.treino.nome]) {
      dataDia['treinos'][this.treino.nome] = this.montarEstruturaDoTreinoParaHoje();
    }

    const serie = this.treino.exercicios[exercicioIndex].series[serieIndex];
    if (!dataDia['treinos'][this.treino.nome].exercicios[exercicioIndex]) {
      dataDia['treinos'][this.treino.nome].exercicios[exercicioIndex] = {
        nome: '',
        series: []
      };
    }

    dataDia['treinos'][this.treino.nome].exercicios[exercicioIndex].series[serieIndex] = { ...serie };

    await setDoc(diaRef, dataDia, { merge: true });
  }

  async carregarSugestoes(treinoNome: string) {
    const diaRef = await this.getDiaDataRef();
    const snap = await getDoc(diaRef);
    const treinoDoDia = snap.data()?.['treinos']?.[treinoNome] as Treino | undefined;

    if (treinoDoDia) {
      this.treino.exercicios = treinoDoDia.exercicios.map(ex => ({
        nome: ex.nome,
        series: ex.series.map(s => ({ ...s }))
      }));
    }

    const sugestoesAnteriores = await this.buscarUltimaExecucaoDoTreino(treinoNome);
    this.sugestoes = sugestoesAnteriores ?? this.treino.exercicios.map(ex =>
      ex.series.map(s => ({ reps: s.reps ?? 0, carga: s.carga ?? 0 }))
    );
  }

  private async buscarUltimaExecucaoDoTreino(treinoNome: string) {
    const diasRef = collection(this.firestore, `users/${this.uid}/dias`);
    const snap = await getDocs(diasRef);

    const documentos = snap.docs
      .map(doc => ({ id: doc.id, data: doc.data() }))
      .filter(doc => doc.id < this.getHoje())
      .sort((a, b) => b.id.localeCompare(a.id));

    for (const doc of documentos) {
      const treino = doc.data?.['treinos']?.[treinoNome];
      if (treino) {
        return treino.exercicios.map((ex: Exercicio) =>
          ex.series.map(s => ({ reps: s.reps ?? 0, carga: s.carga ?? 0 }))
        );
      }
    }

    return null;
  }

  async adicionarExercicio() {
    if (!this.novoExercicio.nome.trim()) return;

    const novo: Exercicio = {
      nome: this.novoExercicio.nome.trim(),
      series: [{ reps: 0, carga: 0 }]
    };

    this.treino.exercicios.push(novo);
    this.sugestoes.push([{ reps: 0, carga: 0 }]);
    this.novoExercicio = { nome: '', series: [] };

    await this.salvarTreinoBase();
    await this.sincronizarTreinoDoDiaComBase();
  }

  async adicionarSerie(exercicio: Exercicio) {
    const nova: Serie = { reps: 0, carga: 0 };
    exercicio.series.push(nova);

    const indexExercicio = this.treino.exercicios.indexOf(exercicio);
    this.sugestoes[indexExercicio].push({ reps: 0, carga: 0 });

    await this.salvarTreinoBase();
    await this.sincronizarTreinoDoDiaComBase();
  }

  async removerSerie(exercicio: Exercicio, index: number) {
    const indexExercicio = this.treino.exercicios.indexOf(exercicio);
    exercicio.series.splice(index, 1);
    this.sugestoes[indexExercicio].splice(index, 1);

    await this.salvarTreinoBase();
    await this.sincronizarTreinoDoDiaComBase();
  }

  async removerExercicio(index: number) {
    this.treino.exercicios.splice(index, 1);
    this.sugestoes.splice(index, 1);

    await this.salvarTreinoBase();
    await this.sincronizarTreinoDoDiaComBase();
  }

  private async salvarTreinoBase() {
  const ref = doc(this.firestore, `users/${this.uid}`);
  const snap = await getDoc(ref);
  const dados = snap.data() ?? {};

  const treinos = (dados['treinos'] ?? []) as Treino[];

  const index = treinos.findIndex(t => t.nome === this.treino.nome);
  if (index >= 0) {
    // ✅ Atualiza o treino mesmo que esteja vazio
    treinos[index] = { ...this.treino };
  } else {
    treinos.push({ ...this.treino });
  }

  await updateDoc(ref, {
    treinos,
    workoutList: treinos.map(t => t.nome)
  });

  console.log('[Firestore] Treinos atualizados com:', treinos);
}

}
