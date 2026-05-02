// app.routes.ts
import { Routes }    from '@angular/router'
import { authGuard } from './shared/guards/auth.guard'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent),
    title: 'Retriever — Never lose things for good'
  },
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth.component').then(m => m.AuthComponent),
    title: 'Sign in — Retriever'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    title: 'Dashboard — Retriever'
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
    canActivate: [authGuard],
    title: 'Register item — Retriever'
  },
  {
    path: 't/:tagId',
    loadComponent: () => import('./finder/finder.component').then(m => m.FinderComponent),
    title: 'Item found — Retriever'
  },
  {
    path: '**',
    redirectTo: ''
  }
]
