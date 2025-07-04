import { Component, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { UserDataService } from '../../core/services/firebase/user-data'; // ajuste o caminho se necessário

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(Auth);
  private userDataService: UserDataService = inject(UserDataService); // ✅ tipo explícito

  loading = false;

  async loginWithGoogle() {
    this.loading = true;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);

      if (result.user) {
        await this.userDataService.initUserDataIfNeeded(); // agora sem erro
        console.log('Login realizado com sucesso!');
        console.log('UID do usuário logado:', result.user.uid);

      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn('Login cancelado pelo usuário.');
      } else {
        console.error('Erro ao logar com Google:', error);
      }
    } finally {
      this.loading = false;
    }
  }
}
