import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, LOCALE_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DATE_PIPE_DEFAULT_TIMEZONE, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

import { App } from './app/app';
import { routes } from './app/app.routes';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

// Quill
import { provideQuillConfig } from 'ngx-quill';

// ⚠️ confira se este caminho está certo no seu projeto
import { environment } from './enviroments/enviroment';

// registra locale pt-BR para pipes de data/número/moeda
registerLocaleData(localePt);

export const appConfig = {
  providers: [
    importProvidersFrom(RouterModule.forRoot(routes)),

    // 🌎 Locale & timezone globais para o DatePipe
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DATE_PIPE_DEFAULT_TIMEZONE, useValue: 'America/Sao_Paulo' },

    // 🔥 Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),

    // 🖊️ Quill (configuração global)
    provideQuillConfig({
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline', 'strike'],
          [{ header: [1, 2, 3, false] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block', 'link'],
          ['clean']
        ]
      },
      theme: 'snow',
      placeholder: 'Digite aqui...'
    })
  ]
};

bootstrapApplication(App, appConfig).catch(err => console.error(err));
