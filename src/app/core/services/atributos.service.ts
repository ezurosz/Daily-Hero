import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../auth/auth.service';
import { Atributos } from '../models/atributos.model';

@Injectable({ providedIn: 'root' })
export class AtributosService {
  constructor(private firestore: Firestore, private auth: AuthService) {}

  // Métodos de atualização serão colocados aqui
}
