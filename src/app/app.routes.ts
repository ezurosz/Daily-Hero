// app.routes.ts
import { Routes } from '@angular/router';
import { PagePage } from './features/dashboard/page.page';
import { XpTesteComponent } from './features/xp-teste/xp-teste';
import { Login } from './auth/login/login'; // ✅ Atenção para o nome do arquivo!
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // redireciona raiz para login
  { path: 'login', component: Login }, // ✅ Aqui acessa o login
  { path: 'dashboard', component: PagePage, /* canActivate: [AuthGuard] */ },
  { path: 'xp-teste', component: XpTesteComponent, /* canActivate: [AuthGuard] */ },
  { path: '**', redirectTo: '' },
];
