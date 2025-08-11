import { Component, OnInit, inject, signal, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';

import { UserDataService } from '../../core/services/firebase/user-data';
import { FixedQuestTemplate } from '../../core/models/fixed-quest-template.model';
import { QuestInstance } from '../../core/models/quest-instance.model';
import { HuntingTemplate } from '../../core/models/hunting-template';
import { getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-missoes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatListModule,
    MatCheckboxModule,
    MatIconModule,
    MatTabsModule,
    MatDialogModule,
  ],
  templateUrl: './missoes.html',
  styleUrls: ['./missoes.scss'],
})
export class MissoesPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private user = inject(UserDataService);
  private dialog = inject(MatDialog);

  @ViewChild('fixedDialog') fixedDialogTpl!: TemplateRef<any>;
  @ViewChild('huntingDialog') huntingDialogTpl!: TemplateRef<any>;

  hoje = this.user['dataHoje']?.() ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

  // Catálogo FIXED (root unificado)
  fixedTemplates = signal<FixedQuestTemplate[]>([]);

  // Quests do DIA (unificado)
  huntingQuests = signal<HuntingTemplate[]>([]);
  fixedQuests   = signal<QuestInstance[]>([]);

  // Getters para instâncias do dia
  get dailyHunting(): HuntingTemplate[] {
    return this.huntingQuests().filter(q => q.categoria === 'daily');
  }
  get weeklyHunting(): HuntingTemplate[] {
    return this.huntingQuests().filter(q => q.categoria === 'weekly');
  }
  get dailyFixed(): QuestInstance[] {
    return this.fixedQuests().filter(q => q.categoria === 'daily');
  }
  get weeklyFixed(): QuestInstance[] {
    return this.fixedQuests().filter(q => q.categoria === 'weekly');
  }

  // Getters para o catálogo (templates)
  get dailyFixedTemplate(): FixedQuestTemplate[] {
    return this.fixedTemplates().filter(t => t.categoria === 'daily');
  }
  get weeklyFixedTemplate(): FixedQuestTemplate[] {
    return this.fixedTemplates().filter(t => t.categoria === 'weekly');
  }

  // flags
  get hasDailyHunting()  { return this.dailyHunting.length  > 0; }
  get hasWeeklyHunting() { return this.weeklyHunting.length > 0; }
  get hasDailyFixed()    { return this.dailyFixed.length    > 0; }
  get hasWeeklyFixed()   { return this.weeklyFixed.length   > 0; }
  get hasDailyFixedTemplate()  { return this.dailyFixedTemplate.length  > 0; }
  get hasWeeklyFixedTemplate() { return this.weeklyFixedTemplate.length > 0; }

  // edição
  editingFixedId: string | null = null;
  editingHuntingId: string | null = null;

  // Forms
  fixedForm = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    categoria: ['daily', Validators.required],
    level: ['fácil', Validators.required],
    tagsStr: [''],
    replicateToday: [false],
  });

  // huntingForm SEM o campo vencimento
  huntingForm = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    level: ['fácil', Validators.required],
    categoria: ['daily', Validators.required],
    tagsStr: [''],
  });

  async ngOnInit() {
    await this.user.initUserDataIfNeeded();
    await this.user.criarDiaSeNaoExistir();

    await this.loadFixedTemplates();
    await this.ensureAndLoadHuntingsDia();
    await this.ensureAndLoadFixedInstances();
  }

  // helpers
  private parseTags(s: string | null | undefined): string[] {
    return (s ?? '').split(',').map(t => t.trim()).filter(Boolean);
  }

  private sanitizeLevel(value: string): FixedQuestTemplate['level'] {
    const allowed: FixedQuestTemplate['level'][] = ['fácil', 'médio', 'difícil', 'insano'];
    return allowed.includes(value as any) ? (value as FixedQuestTemplate['level']) : 'fácil';
  }

  private sanitizeTags(values: string[]): NonNullable<FixedQuestTemplate['tags']> {
    const allowed: NonNullable<FixedQuestTemplate['tags']> = [
      'Social', 'Estudo', 'Fé', 'Força', 'Consciência', 'Padrão'
    ];
    return values.filter((t): t is typeof allowed[number] => allowed.includes(t as any));
  }

  private calcVencimento(categoria: 'daily'|'weekly'): string {
    const d = new Date();
    if (categoria === 'daily') d.setHours(d.getHours() + 24);
    else d.setDate(d.getDate() + 7);
    return d.toISOString();
  }

  private async applyFixedTemplateToToday(tmpl: FixedQuestTemplate) {
    await this.user.criarDiaSeNaoExistir();
    const diaRef = await this.user.getDiaDocRef(this.hoje);
    const diaSnap = await getDoc(diaRef);
    const diaData = diaSnap.data() as any || {};

    const fixed: QuestInstance[] = (diaData.fixedQuests ?? []) as QuestInstance[];

    if (!fixed.length) {
      await this.user.instanciarFixedQuests();
      const refreshed = await getDoc(diaRef);
      const refreshedData = refreshed.data() as any || {};
      const fixedReloaded: QuestInstance[] = (refreshedData.fixedQuests ?? []) as QuestInstance[];

      const updated = fixedReloaded.map(inst => {
        const mesmoTemplate = inst.templateId === tmpl.id || inst.id === tmpl.id;
        if (!mesmoTemplate) return inst;

        const categoriaMudou = inst.categoria !== tmpl.categoria;
        return {
          ...inst,
          descricao: tmpl.descricao,
          categoria: tmpl.categoria,
          level: tmpl.level,
          tags: tmpl.tags ?? [],
          appliedRev: tmpl.rev ?? 1,
          vencimento: categoriaMudou ? this.calcVencimento(tmpl.categoria as any) : inst.vencimento,
        };
      });

      await updateDoc(diaRef, { fixedQuests: updated });
      return;
    }

    const updated = fixed.map(inst => {
      const mesmoTemplate = inst.templateId === tmpl.id || inst.id === tmpl.id;
      if (!mesmoTemplate) return inst;

      const categoriaMudou = inst.categoria !== tmpl.categoria;
      return {
        ...inst,
        descricao: tmpl.descricao,
        categoria: tmpl.categoria,
        level: tmpl.level,
        tags: tmpl.tags ?? [],
        appliedRev: tmpl.rev ?? 1,
        vencimento: categoriaMudou ? this.calcVencimento(tmpl.categoria as any) : inst.vencimento,
      };
    });

    await updateDoc(diaRef, { fixedQuests: updated });
  }

  // FIXED TEMPLATES (root)
  async loadFixedTemplates() {
    await this.user.carregarFixedQuests();
    const all: FixedQuestTemplate[] = [
      ...(this.user.dailyFixedQuests  || []),
      ...(this.user.weeklyFixedQuests || []),
    ];
    this.fixedTemplates.set(all);
  }

  editFixed(q: FixedQuestTemplate) {
    this.editingFixedId = q.id;
    this.fixedForm.patchValue({
      descricao: q.descricao,
      categoria: q.categoria,
      level: q.level,
      tagsStr: (q.tags || []).join(', '),
      replicateToday: false,
    });
  }

  // Modais
  openFixedEditor(q?: FixedQuestTemplate) {
    if (q) {
      this.editFixed(q);
    } else {
      this.editingFixedId = null;
      this.fixedForm.reset({ categoria: 'daily', level: 'fácil', tagsStr: '', replicateToday: false });
    }
    this.dialog.open(this.fixedDialogTpl, { autoFocus: true });
  }

  openHuntingEditor(q?: HuntingTemplate) {
    if (q) {
      // edição
      this.editingHuntingId = q.id;
      this.huntingForm.patchValue({
        descricao: q.descricao,
        level: q.level,
        categoria: q.categoria,
        tagsStr: (q.tags || []).join(', '),
      });
    } else {
      // criação
      this.editingHuntingId = null;
      this.huntingForm.reset({ level: 'fácil', categoria: 'daily', tagsStr: '' });
    }
    this.dialog.open(this.huntingDialogTpl, { autoFocus: true });
  }

  async saveFixed() {
    const v = this.fixedForm.getRawValue();
    const newItem: FixedQuestTemplate = {
      id: this.editingFixedId ?? crypto.randomUUID(),
      descricao: v.descricao!,
      categoria: v.categoria as any,
      level: this.sanitizeLevel(v.level!),
      fixa: true,
      tags: this.sanitizeTags(this.parseTags(v.tagsStr!)),
      rev: 1,
    };

    const userRef = await this.user.getUserDocRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    const current = (data['fixedQuests'] ?? []) as FixedQuestTemplate[];

    await updateDoc(userRef, { fixedQuests: [newItem, ...current.filter(x => x.id !== newItem.id)] });

    if (this.editingFixedId && v.replicateToday) {
      await this.applyFixedTemplateToToday(newItem);
      await this.ensureAndLoadFixedInstances();
    }

    this.editingFixedId = null;
    this.fixedForm.reset({ categoria: 'daily', level: 'fácil', tagsStr: '', replicateToday: false });
    await this.loadFixedTemplates();
    this.dialog.closeAll();
  }

  async removeFixed(q: FixedQuestTemplate) {
    const userRef = await this.user.getUserDocRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    const current = (data['fixedQuests'] ?? []) as FixedQuestTemplate[];
    await updateDoc(userRef, { fixedQuests: current.filter(x => x.id !== q.id) });

    if (this.editingFixedId === q.id) this.editingFixedId = null;
    await this.loadFixedTemplates();
  }

  // HUNTINGS
  async saveHunting() {
    const v = this.huntingForm.getRawValue();

    // vencimento automático com base na categoria
    const vencimentoISO = this.calcVencimento(v.categoria as 'daily' | 'weekly');

    const item: HuntingTemplate = {
      id: this.editingHuntingId ?? crypto.randomUUID(),
      descricao: v.descricao!,
      categoria: v.categoria as any,
      level: this.sanitizeLevel(v.level!),
      vencimento: vencimentoISO,
      concluida: false,
      checkDate: null,
      expirado: false,
      tags: this.sanitizeTags(this.parseTags(v.tagsStr!)),
      rev: 1,
    };

    const userRef = await this.user.getUserDocRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    const existentes = (data['huntingQuests'] ?? []) as HuntingTemplate[];

    await updateDoc(userRef, { huntingQuests: [item, ...existentes.filter(x => x.id !== item.id)] });

    await this.ensureAndLoadHuntingsDia();

    this.editingHuntingId = null;
    this.huntingForm.reset({ level: 'fácil', categoria: 'daily', tagsStr: '' });
    this.dialog.closeAll();
  }

  async removeHunting(q: HuntingTemplate) {
    const userRef = await this.user.getUserDocRef();
    const snap = await getDoc(userRef);
    const data = snap.data() ?? {};
    const existentes = (data['huntingQuests'] ?? []) as HuntingTemplate[];
    await updateDoc(userRef, { huntingQuests: existentes.filter(x => x.id !== q.id) });

    await this.ensureAndLoadHuntingsDia();
    if (this.editingHuntingId === q.id) this.editingHuntingId = null;
  }

  private async ensureAndLoadHuntingsDia() {
    await this.user.criarDiaSeNaoExistir();
    await this.user.instanciarHuntingQuests();
    const dia = await this.user.getDiaData(this.hoje);
    this.huntingQuests.set((dia?.huntingQuests ?? []) as HuntingTemplate[]);
  }

  async ensureAndLoadFixedInstances() {
    await this.user.criarDiaSeNaoExistir();
    await this.user.instanciarFixedQuests();
    const dia = await this.user.getDiaData(this.hoje);
    this.fixedQuests.set((dia?.fixedQuests ?? []) as QuestInstance[]);
  }

  // toggles
  async toggleHuntingQuest(q: HuntingTemplate) {
    this.comTravaDeTempo(async () => {
      const novaConclusao = !q.concluida;
      await this.user.toggleConclusaoHunting(q.id, novaConclusao);
      const xp = q.categoria === 'daily' ? (novaConclusao ? 20 : -20) : (novaConclusao ? 40 : -40);
      this.atualizarXPNoFront(xp);
      await this.ensureAndLoadHuntingsDia();
    });
  }

  async toggleFixedQuest(q: QuestInstance) {
    this.comTravaDeTempo(async () => {
      const novaConclusao = !q.concluida;
      await this.user.toggleConclusaoFixedQuest(q.id, novaConclusao);
      const xp = q.categoria === 'daily' ? (novaConclusao ? 15 : -15) : (novaConclusao ? 30 : -30);
      this.atualizarXPNoFront(xp);
      await this.ensureAndLoadFixedInstances();
    });
  }

  // placeholders
  comTravaDeTempo: (fn: () => Promise<void>) => void = (fn) => fn();
  atualizarXPNoFront: (delta: number) => void = (_d) => {};
}
