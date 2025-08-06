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
import { Treino, Exercicio, Serie } from '../../core/models/treino.model';

import { Router } from '@angular/router';

@Component({
  selector: 'app-treinos',
  standalone: true,
  templateUrl: './treinos.html',
  styleUrl: './treinos.scss',
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
export class Treinos implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  treinos: Treino[] = [];
  novoTreino: Treino = { nome: '', exercicios: [] };
  treinoEditando: Treino | null = null;

  novoExercicio: Exercicio = { nome: '', series: [] };
  novaSerie: Serie = { reps: 0, carga: 0 };

  async ngOnInit() {
    console.log('[Treinos] ngOnInit chamado!');

    const esperaUsuario = async (): Promise<string> => {
      let tentativas = 0;
      let uid = this.authService.getCurrentUser()?.uid;

      while (!uid && tentativas < 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        uid = this.authService.getCurrentUser()?.uid;
        tentativas++;
      }

      if (!uid) throw new Error('Usuário não autenticado após espera');
      return uid;
    };

    try {
      const uid = await esperaUsuario();
      this.treinos = await this.getTreinosOnceComUid(uid);
    } catch (erro) {
      console.error('Erro ao inicializar treinos:', erro);
    }
  }

  private async getUserDocRef(): Promise<ReturnType<typeof doc>> {
    const uid = this.authService.getCurrentUser()?.uid;
    if (!uid) throw new Error('Usuário não autenticado');
    return doc(this.firestore, `users/${uid}`);
  }

  private async getTreinosOnceComUid(uid: string): Promise<Treino[]> {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    return (snap.data()?.['treinos'] ?? []) as Treino[];
  }

  async getTreinosOnce(): Promise<Treino[]> {
    const ref = await this.getUserDocRef();
    const snap = await getDoc(ref);
    return (snap.data()?.['treinos'] ?? []) as Treino[];
  }

  async adicionarTreino() {
    if (!this.novoTreino.nome.trim()) return;

    const ref = await this.getUserDocRef();
    const treinosAtuais = await this.getTreinosOnce();
    const atualizados = [...treinosAtuais, this.novoTreino];

    await updateDoc(ref, {
      treinos: atualizados,
      workoutList: atualizados.map(t => t.nome)
    });

    this.treinos = atualizados;
    this.novoTreino = { nome: '', exercicios: [] };
  }

  async excluirTreino(nome: string) {
    const ref = await this.getUserDocRef();
    const atualizado = this.treinos.filter(t => t.nome !== nome);
    await updateDoc(ref, {
      treinos: atualizado,
      workoutList: atualizado.map(t => t.nome)
    });
    this.treinos = atualizado;
  }

   navegarParaEditar(nomeTreino: string) {
    this.router.navigate(['/editar-treino', nomeTreino]);
  }
}
