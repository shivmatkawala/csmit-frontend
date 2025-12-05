import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent {
  // Default view is 'home'
  currentView: string = 'home';

  // Method to handle view switching
  onPageChange(view: string) {
    this.currentView = view;
    // Scroll to top smoothly when view changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}