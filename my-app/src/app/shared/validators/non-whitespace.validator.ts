import type { AbstractControl, ValidatorFn } from '@angular/forms';

export const nonWhitespaceValidator: ValidatorFn = (control: AbstractControl) =>
  typeof control.value === 'string' && control.value.trim().length > 0
    ? null
    : { whitespace: true };
