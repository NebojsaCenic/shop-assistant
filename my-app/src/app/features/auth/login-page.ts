import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login-page',
  styleUrl: './login-page.scss',
  templateUrl: './login-page.html',
  standalone: true,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      const result = await this.auth.signIn(email.trim(), password);
      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      const navigated = await this.router.navigateByUrl(this.getSafeReturnUrl());
      if (!navigated) {
        this.errorMessage.set('Prijavljeni ste, ali stranicu nije moguće otvoriti.');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.errorMessage.set(
          'Ne možemo da se povežemo sa servisom za prijavu. Proveri internet vezu.',
        );
        return;
      }
      throw error;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getSafeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/';
  }
}
