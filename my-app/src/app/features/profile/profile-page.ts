import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile-page',
  styleUrl: './profile-page.scss',
  templateUrl: './profile-page.html',
  standalone: true,
})
export class ProfilePage {
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);
  readonly errorMessage = signal<string | null>(null);
  readonly isSigningOut = signal(false);

  async signOut(): Promise<void> {
    this.errorMessage.set(null);
    this.isSigningOut.set(true);

    try {
      const result = await this.auth.signOut();
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      const navigated = await this.router.navigateByUrl('/prijava');
      if (!navigated) {
        this.errorMessage.set(
          'Uspešno si se odjavila, ali stranicu za prijavu nije moguće otvoriti.',
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set('Odjava nije uspela. Proveri internet vezu i pokušaj ponovo.');
        return;
      }
      throw error;
    } finally {
      this.isSigningOut.set(false);
    }
  }
}
