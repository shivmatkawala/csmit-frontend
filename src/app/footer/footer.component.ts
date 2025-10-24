import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  // State to track if the user has scrolled enough to show the button
  isScrolled = false;

  constructor() {}

  /**
   * Listens for the window scroll event to determine if the scroll-to-top button should be visible.
   */
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Show the button after scrolling down 300px
    this.isScrolled = window.scrollY > 300;
  }

  /**
   * Scrolls the viewport smoothly to the top of the page.
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
