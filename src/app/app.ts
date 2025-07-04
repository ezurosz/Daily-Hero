// src/app/app.ts
import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    await this.authService.waitForAuthReady();

    const user = this.authService.getCurrentUser();
    const path = window.location.pathname;

    const isLoginPage = path === '/login';
    const rotasProtegidas = ['/dashboard', '/perfil', '/treino'];
    const precisaLogin = rotasProtegidas.some(p => path.startsWith(p));

    if (user && isLoginPage) {
      console.log('[⚡] Usuário já logado, redirecionando para dashboard...');
      this.router.navigate(['/dashboard']);
    }

    if (!user && precisaLogin) {
      console.log('[🔒] Acesso não autorizado. Redirecionando para login...');
      this.router.navigate(['/login']);
    }
  }
}
