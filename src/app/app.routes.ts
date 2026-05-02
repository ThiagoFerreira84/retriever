import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: 't/:tagId',
    loadComponent: () =>
      import('./finder/finder.component').then(m => m.FinderComponent),
    title: 'Item found — Retriever'
  },
  {
    path: '**',
    redirectTo: 't/testkeys'
  }
]