import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { RouterModule } from '@angular/router';

import { App } from './app/app';
import { routes } from './app/app.routes';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore'; // ✅ AQUI
import { environment } from './enviroments/enviroment';

export const appConfig = {
  providers: [
    importProvidersFrom(RouterModule.forRoot(routes)),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()) // ✅ ESSA LINHA ADICIONADA
  ]
};

bootstrapApplication(App, appConfig)
  .catch(err => console.error(err));
