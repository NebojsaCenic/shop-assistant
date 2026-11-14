import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-placeholder',
  standalone: true,
  styleUrl: './page-placeholder.scss',
  templateUrl: './page-placeholder.html',
})
export class PagePlaceholder {
  readonly description = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly notice = input.required<string>();
  readonly title = input.required<string>();
}
