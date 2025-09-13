import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { QuillModule } from 'ngx-quill';

import { CodexService } from '../../core/services/codex.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { user } from 'rxfire/auth';

@Component({
  standalone: true,
  selector: 'app-codex-home',
  imports: [CommonModule, FormsModule, RouterModule, QuillModule],
  templateUrl: './codex-home.html',
  styleUrls: ['./codex-home.scss'],
})
export class CodexHomePage {
  private codex = inject(CodexService);
  private fs = inject(Firestore);
  private auth = inject(Auth);

  // UI state
  newBlockTitle = '';
  reflexaoHoje = ''; // HTML do Quill

  // feedback
  busy = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  // data
  blocks = signal<any[]>([]);

  // badges
  inteligenciaFeitaHoje = signal<boolean>(false);
  conscienciaFeitaHoje = signal<boolean>(false);

  // debounce interno
  private reflexaoTimer?: any;
  private autosaveDelay = 800; // ms após parar de digitar

  constructor() {
    this.init();
  }

  // ---------- helpers ----------
  private todayKey(date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private async getUid(): Promise<string> {
    const u = await firstValueFrom(user(this.auth));
    if (!u) throw new Error('Usuário não autenticado');
    return u.uid;
  }

  private showError(msg: string, err?: unknown) {
    console.error(msg, err);
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 4000);
  }
  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 1500);
  }

  // ---------- boot ----------
  private async init() {
    this.busy.set(true);
    try {
      await this.reloadBlocks();
      await this.loadReflexaoHoje(); // carrega reflexão existente do DOC do dia
      await this.reloadFlags();
    } catch (e) {
      this.showError('Falha ao carregar o Codex.', e);
    } finally {
      this.busy.set(false);
    }
  }

  // ---------- loaders ----------
  async reloadBlocks() {
    const snap = await this.codex.listBlocks();
    this.blocks.set(snap.docs);
  }

  async reloadFlags() {
    const uid = await this.getUid();
    const today = this.todayKey();
    const diaRef = doc(this.fs, `users/${uid}/dias/${today}`);
    const snap = await getDoc(diaRef);
    const flags = (snap.data()?.['codexFlags'] ?? {}) as { inteligencia?: boolean; consciencia?: boolean };
    this.inteligenciaFeitaHoje.set(!!flags.inteligencia);
    this.conscienciaFeitaHoje.set(!!flags.consciencia);
  }

  async loadReflexaoHoje() {
    try {
      const { text } = await this.codex.getReflexaoHoje(); // lê do DOC do dia
      this.reflexaoHoje = text ?? '';
    } catch (e) {
      this.showError('Não foi possível carregar a reflexão do dia.', e);
    }
  }

  // ---------- actions ----------
  async createBlock() {
    const title = this.newBlockTitle.trim();
    if (!title) return;

    this.busy.set(true);
    try {
      const id = await this.codex.createBlock(title);
      console.log('[Codex] bloco criado:', id);
      this.newBlockTitle = '';
      await this.reloadBlocks();
      this.showSuccess('Bloco criado.');
    } catch (e) {
      this.showError('Falha ao criar bloco. Veja o console para detalhes.', e);
    } finally {
      this.busy.set(false);
    }
  }

  // chamada a cada alteração no quill (autosave com debounce)
  onReflexaoInput() {
    clearTimeout(this.reflexaoTimer);
    this.reflexaoTimer = setTimeout(async () => {
      try {
        await this.codex.upsertReflexaoHoje(this.reflexaoHoje); // grava HTML no DOC do dia
        this.showSuccess('Salvo');
        await this.reloadFlags();
      } catch (e) {
        this.showError('Falha ao salvar reflexão (autosave).', e);
      }
    }, this.autosaveDelay);
  }
}
