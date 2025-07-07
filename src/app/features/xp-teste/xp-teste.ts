import { Component, inject, OnInit } from '@angular/core';
import { UserDataService } from '../../core/services/firebase/user-data';
import { getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-xp-teste',
  standalone: true,
  template: `
    <div style="padding: 16px">
      <button (click)="executarTestes()">Executar Testes</button>
    </div>
  `,
})
export class XpTesteComponent implements OnInit {
  private userData = inject(UserDataService);
  dadosUsuario: any = null;

  ngOnInit(): void {
    this.userData.initUserDataIfNeeded().then(() => {
      this.carregarDados();
    });
  }

  async carregarDados() {
    try {
      const ref = await this.userData.getUserDocRef();
      const snapshot = await getDoc(ref);
      this.dadosUsuario = snapshot.data();
      console.log('📦 Dados carregados:', this.dadosUsuario);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    }
  }

  async executarTestes() {
    try {
      // XP
     /*  await this.userData.adicionarXP(120);
      console.log('✅ XP adicionada ao dia atual'); */
      
      // Quests
      await this.userData.addDefaultDailyQuests();
      console.log('✅ Quest templates adicionados');

      await this.userData.addDefaultHuntingQuests();
      console.log('✅ Quests do dia geradas');

      // Treino
      /* await this.userData.marcarTreinoNoDia('Treino A');
      console.log('✅ Treino salvo para hoje'); */

      // Água
    /*   await this.userData.marcarAguaNoDia(2);
      console.log('✅ Consumo de água salvo'); */

      // Refeições no documento do DIA (não mais no documento principal)
      /* await this.userData.marcarTodasRefeicoesFalse();
      console.log('✅ Refeições adicionadas no documento do dia'); */

      // Lista de treinos permanece no doc principal
      /* await this.addDefaultWorkoutList();
      console.log('✅ Lista de treinos adicionada no documento do usuário'); */
    } catch (error) {
      console.error('❌ Erro ao executar testes:', error);
    }
  }

  async addDefaultWorkoutList() {
    const ref = await this.userData.getUserDocRef();
    await updateDoc(ref, {
      workoutList: ['Treino A', 'Treino B', 'Treino C', 'Treino D'],
    });
  }
}