import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';

import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../auth/auth.service';
import { WorkoutPlan, Exercicio, Serie } from '../../core/models/treino.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-workout-plan',
  standalone: true,
  templateUrl: './workout-plan.html',
  styleUrls: ['./workout-plan.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule
  ]
})
export class WorkoutPlanComponent implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Fonte única da verdade no doc do usuário
  workoutPlan: WorkoutPlan[] = [];

  novoTreino: WorkoutPlan = { nome: '', exercicios: [] };
  treinoEditando: WorkoutPlan | null = null;

  novoExercicio: Exercicio = { nome: '', series: [] };
  novaSerie: Serie = { reps: 0, carga: 0 };

  async ngOnInit() {
    const uid = await this.esperarUsuario();
    this.workoutPlan = await this.getPlansOnceWithUid(uid);
  }

  // ===== Firestore helpers =====
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

  private async getUserDocRef() {
    const uid = await this.esperarUsuario();
    return doc(this.firestore, `users/${uid}`);
  }

  private async getPlansOnceWithUid(uid: string): Promise<WorkoutPlan[]> {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    const data = snap.data() ?? {};
    return (data['workoutPlan'] ?? []) as WorkoutPlan[];
  }

  private async getPlansOnce(): Promise<WorkoutPlan[]> {
    const ref = await this.getUserDocRef();
    const snap = await getDoc(ref);
    const data = snap.data() ?? {};
    return (data['workoutPlan'] ?? []) as WorkoutPlan[];
  }

  // ===== CRUD =====
  async adicionarTreino() {
    if (!this.novoTreino.nome.trim()) return;

    const ref = await this.getUserDocRef();
    const atuais = await this.getPlansOnce();
    const atualizados = [...atuais, this.novoTreino];

    await updateDoc(ref, {
      workoutPlan: atualizados,
      workoutList: atualizados.map(t => t.nome),
    });

    this.workoutPlan = atualizados;
    this.novoTreino = { nome: '', exercicios: [] };
  }

  async excluirTreino(nome: string) {
    const ref = await this.getUserDocRef();
    const atuais = await this.getPlansOnce();
    const atualizados = atuais.filter(t => t.nome !== nome);

    await updateDoc(ref, {
      workoutPlan: atualizados,
      workoutList: atualizados.map(t => t.nome),
    });

    this.workoutPlan = atualizados;
  }

  navegarParaEditar(nomeTreino: string) {
    this.router.navigate(['/editar-treino', nomeTreino]);
  }
}
