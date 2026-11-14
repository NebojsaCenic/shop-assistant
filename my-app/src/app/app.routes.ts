import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';

const placeholderPage = () =>
  import('./shared/page-placeholder').then((module) => module.PagePlaceholder);

export const routes: Routes = [
  {
    path: 'prijava',
    loadComponent: () => import('./features/auth/login-page').then((module) => module.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((module) => module.MainLayout),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        loadComponent: placeholderPage,
        data: {
          eyebrow: 'TVOJA LIČNA BAZA PROIZVODA',
          title: 'Dobro došla u Moju korpu',
          description:
            'Sačuvaj proizvode koje redovno kupuješ i lako ih pronađi kada ti zatrebaju.',
          notice: 'Ovde ćeš imati pregled svoje kolekcije i brz pristup kupovini.',
        },
        pathMatch: 'full',
      },
      {
        path: 'kategorije',
        loadComponent: () =>
          import('./features/categories/categories-page').then((module) => module.CategoriesPage),
      },
      {
        path: 'proizvodi',
        loadComponent: () =>
          import('./features/products/products-page').then((module) => module.ProductsPage),
      },
      {
        path: 'kupovina',
        loadComponent: () =>
          import('./features/shopping/shopping-page').then((module) => module.ShoppingPage),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profile/profile-page').then((module) => module.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
