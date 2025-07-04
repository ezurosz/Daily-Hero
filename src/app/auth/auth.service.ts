import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth: Auth = inject(Auth);
  private user: User | null = null;
  private isReady = false;

  constructor(private router: Router) {
  onAuthStateChanged(this.auth, (user) => {
    this.user = user;
    this.isReady = true;

    const currentPath = window.location.pathname;

    // ✅ Lista de rotas protegidas
    const rotasProtegidas = ['/dashboard', '/perfil', '/treino']; // 🔧 '/xp-teste' não está aqui

    // ✅ Redireciona para dashboard se estiver na tela de login
    if (user && currentPath === '/login') {
      console.log('[⚡] Redirecionando para dashboard após login detectado.');
      this.router.navigate(['/dashboard']);
    }

    const precisaLogin = rotasProtegidas.some(path => currentPath.startsWith(path));

    // ✅ Redireciona apenas se for uma rota protegida
    if (!user && precisaLogin) {
      console.log('[🔒] Rota protegida sem autenticação. Redirecionando para login.');
      this.router.navigate(['/login']);
    }
  });
}

  /** Espera até que o Firebase informe o estado de autenticação */
  waitForAuthReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isReady) return resolve();

      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        this.isReady = true;
        unsubscribe();
        resolve();
      });
    });
  }
  

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  logout() {
    return signOut(this.auth).then(() => this.router.navigate(['/login']));
  }

  isLoggedIn(): boolean {
    return this.user !== null;
  }

  getCurrentUser(): User | null {
    return this.user;
  }
}
