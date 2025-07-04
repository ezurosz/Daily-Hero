import { Component, inject, OnInit } from '@angular/core';
import { UserDataService } from '../../core/services/firebase/user-data';
import { getDoc } from '@angular/fire/firestore';
import { updateDoc } from '@angular/fire/firestore';

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
      await this.userData.updateXP(120, 2);
      console.log('✅ XP e nível atualizados');

      await this.userData.setWorkoutForToday('Treino A');
      console.log('✅ Treino salvo');

      await this.userData.setWaterToday(2);
      console.log('✅ Consumo de água salvo');

      await this.userData.addDefaultDailies();
      await this.userData.addDefaultWeeklies();
      console.log('✅ Dailies e Weeklies cadastradas');

      await this.addDefaultMeals();
      console.log('✅ Refeições cadastradas');

      await this.addDefaultWorkouts();
      console.log('✅ Treinos cadastrados');

    } catch (error) {
      console.error('❌ Erro ao executar testes:', error);
    }
  }

  async addDefaultMeals() {
    const ref = await this.userData.getUserDocRef();
    await updateDoc(ref, {
      meals: {
        'Café da Manhã': false,
        'Almoço': false,
        'Lanche': false,
        'Jantar': false
      }
    });
  }

  async addDefaultWorkouts() {
    const ref = await this.userData.getUserDocRef();
    await updateDoc(ref, {
      workoutList: ['Treino A', 'Treino B', 'Treino C', 'Treino D']
    });
  }
}
