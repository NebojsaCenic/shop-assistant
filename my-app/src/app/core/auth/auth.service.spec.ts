import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from '../supabase/supabase.provider';

describe('AuthService', () => {
  let signInError: { code: string } | null;

  beforeEach(() => {
    signInError = { code: 'invalid_credentials' };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            auth: {
              getSession: async () => ({ data: { session: null }, error: null }),
              onAuthStateChange: () => ({
                data: { subscription: { unsubscribe: () => undefined } },
              }),
              signInWithPassword: async () => ({
                data: { session: null },
                error: signInError,
              }),
              signOut: async () => ({ error: null }),
            },
          },
        },
      ],
    });
  });

  it('shows a localized message for invalid credentials', async () => {
    const auth = TestBed.inject(AuthService);
    await auth.waitUntilReady();

    await expect(auth.signIn('person@example.com', 'wrong-password')).resolves.toEqual({
      success: false,
      message: 'Imejl adresa ili lozinka nisu ispravni.',
    });
  });
});
