import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { CategoryService } from './features/categories/category.service';
import { ProductService } from './features/products/product.service';

describe('App', () => {
  let authenticated: boolean;

  beforeEach(async () => {
    authenticated = true;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ email: 'owner@example.com' }),
            initializationError: signal<string | null>(null),
            isAuthenticated: () => authenticated,
            signIn: async () => ({ success: true }),
            signOut: async () => ({ success: true }),
            waitUntilReady: async () => undefined,
          },
        },
        {
          provide: CategoryService,
          useValue: { getCategories: async () => ({ success: true, data: [] }) },
        },
        {
          provide: ProductService,
          useValue: { getProducts: async () => ({ success: true, data: [] }) },
        },
      ],
    }).compileComponents();
  });

  it('should create the app root', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders Serbian navigation and the landing page for an authenticated user', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navigationLabels = Array.from(compiled.querySelectorAll('.bottom-nav a span')).map(
      (label) => label.textContent?.trim(),
    );

    expect(compiled.querySelector('.brand-name')?.textContent?.trim()).toBe('Moja korpa');
    expect(navigationLabels).toEqual(['Početna', 'Kategorije', 'Proizvodi', 'Kupovina', 'Profil']);
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Dobro došla u Moju korpu');
  });

  it('redirects an unauthenticated user from a protected route to sign in', async () => {
    authenticated = false;
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);

    await router.navigateByUrl('/kategorije');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(router.url).toContain('/prijava?returnUrl=');
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Prijava');
  });
});
