// ================== IMPORTS ==================
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { QuestInstance } from '../../core/models/quest-instance.model';
// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-missoes',
   standalone: true,
  templateUrl: './missoes.html',
  styleUrls: ['./missoes.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDialogModule, MatSelectModule, MatInputModule, MatSlideToggleModule,
  ],
})
export class Missoes {
  /* huntings$ = this.svc.huntingQuests$();
  fixed$    = this.svc.fixedQuests$();

  constructor(private svc: QuestsService, private dialog: MatDialog) {}

  // Abrir modal de criação
  openCreateHunting() {
    const ref = this.dialog.open(HuntingDialogComponent, {width: '420px'});
    ref.afterClosed().subscribe(async (data?: BaseQuest) => {
      if (!data) return;
      await this.svc.addHunting(data);
    });
  }
  openCreateFixed() {
    const ref = this.dialog.open(FixedDialogComponent, {width: '420px'});
    ref.afterClosed().subscribe(async (data?: BaseQuest) => {
      if (!data) return;
      await this.svc.addFixed(data);
    });
  }

  // Ações
  async toggleFixaFixed(q: BaseQuest) {
    // user controla a propriedade 'fixa' mesmo nas fixed
    await this.svc.updateFixed({...q, fixa: !q.fixa});
  }
  async deleteHunting(id: string) { await this.svc.deleteHunting(id); }
  async deleteFixed(id: string)   { await this.svc.deleteFixed(id); } */

}
