import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { QuillModule } from 'ngx-quill';

import { CodexService } from '../../core/services/codex.service';

@Component({
  standalone: true,
  selector: 'app-codex-block',
  imports: [CommonModule, FormsModule, RouterModule, QuillModule],
  templateUrl: './codex-block.html',
  styleUrls: ['./codex-block.scss'],
})
export class CodexBlockPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private codex = inject(CodexService);

  blockId: string | null = null;
  title = '';

  /** Conteúdo do editor (HTML) salvo no próprio documento do bloco */
  contentHtml = '';

  // feedback
  busy = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  // debounce autosave
  private saveTimer?: any;
  private autosaveDelay = 700;

  async ngOnInit() {
    this.blockId = this.route.snapshot.paramMap.get('id');
    if (!this.blockId) return;

    // carrega doc do bloco (título + conteúdo)
    const snap = await this.codex.getBlock(this.blockId);
    if (!snap.exists()) {
      this.router.navigate(['/codex']);
      return;
    }
    const data = snap.data() as any;
    this.title = data?.title ?? '';
    this.contentHtml = data?.contentHtml ?? '';
  }

  // ---- ações ----
  async rename() {
    if (!this.blockId) return;
    const name = this.title.trim();
    if (!name) return;

    this.busy.set(true);
    try {
      await this.codex.renameBlock(this.blockId, name);
      this.flashSuccess('Bloco renomeado.');
    } catch (e) {
      this.flashError('Falha ao renomear bloco.', e);
    } finally {
      this.busy.set(false);
    }
  }

  async deleteBlock() {
    if (!this.blockId) return;
    const ok = confirm('Excluir este bloco? Essa ação não pode ser desfeita.');
    if (!ok) return;

    this.busy.set(true);
    try {
      await this.codex.deleteBlock(this.blockId);
      this.router.navigate(['/codex']);
    } catch (e) {
      this.flashError('Falha ao excluir bloco.', e);
    } finally {
      this.busy.set(false);
    }
  }

  // ---- AUTOSAVE no Firestore ----
  onEditorInput() {
    if (!this.blockId) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(async () => {
      try {
        await this.codex.upsertBlockContent(this.blockId!, this.contentHtml || '');
        this.successMsg.set('Salvo');
        setTimeout(() => this.successMsg.set(''), 1000);
      } catch (e) {
        this.flashError('Falha ao salvar conteúdo.', e);
      }
    }, this.autosaveDelay);
  }

  // ---- feedback helpers ----
  private flashError(msg: string, err?: unknown) {
    console.error(msg, err);
    this.errorMsg.set(msg);
    setTimeout(() => this.errorMsg.set(''), 2500);
  }
  private flashSuccess(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 1200);
  }
}
