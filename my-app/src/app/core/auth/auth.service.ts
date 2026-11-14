import { computed, inject, Injectable, signal } from '@angular/core';
import type { AuthError, Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.provider';

export type AuthResult = { success: true } | { success: false; message: string };

const authErrorMessages: Readonly<Record<string, string>> = {
  email_not_confirmed: 'Potvrdi svoju imejl adresu pre prijave.',
  invalid_credentials: 'Imejl adresa ili lozinka nisu ispravni.',
  over_request_rate_limit: 'Previše pokušaja prijave. Sačekaj malo pa pokušaj ponovo.',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly sessionState = signal<Session | null>(null);
  private readonly readyState = signal(false);
  private readonly initializationErrorState = signal<string | null>(null);
  private readonly initialization: Promise<void>;

  readonly currentUser = computed(() => this.sessionState()?.user ?? null);
  readonly isReady = this.readyState.asReadonly();
  readonly initializationError = this.initializationErrorState.asReadonly();

  constructor() {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionState.set(session);
      this.readyState.set(true);
      if (session) {
        this.initializationErrorState.set(null);
      }
    });
    this.initialization = this.initialize();
  }

  waitUntilReady(): Promise<void> {
    return this.initialization;
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, message: this.getAuthErrorMessage(error) };
      }
      if (!data.session) {
        return { success: false, message: 'Prijava nije uspela. Pokušaj ponovo.' };
      }

      this.sessionState.set(data.session);
      this.initializationErrorState.set(null);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: 'Ne možemo da se povežemo sa servisom za prijavu. Proveri internet vezu.',
        };
      }
      throw error;
    }
  }

  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        return { success: false, message: this.getAuthErrorMessage(error) };
      }

      this.sessionState.set(null);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: 'Odjava nije uspela. Proveri internet vezu i pokušaj ponovo.',
        };
      }
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        this.initializationErrorState.set(this.getAuthErrorMessage(error));
        return;
      }

      this.sessionState.set(data.session);
    } catch (error) {
      if (error instanceof Error) {
        this.initializationErrorState.set(
          'Prijava trenutno nije dostupna. Proveri internet vezu i pokušaj ponovo.',
        );
        return;
      }
      throw error;
    } finally {
      this.readyState.set(true);
    }
  }

  private getAuthErrorMessage(error: AuthError): string {
    return (error.code && authErrorMessages[error.code]) ?? 'Prijava nije uspela. Pokušaj ponovo.';
  }
}
