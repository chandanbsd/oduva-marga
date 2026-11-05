import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import { AuthStore } from '../../../state/auth/auth.store';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss'
})
export class LandingPageComponent {
  private readonly store = inject(AuthStore);

  readonly user = this.store.user;

  logout(): void {
    this.store.logout();
  }
}
