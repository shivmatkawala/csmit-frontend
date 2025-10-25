import { Component, HostListener, ElementRef } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  isMenuOpen = false;
  isHeaderScrolled = false;
  // Naya state logo zoom ko control karne ke liye
  isLogoZoomed = false;
  // Naya state error icon ki visibility control karne ke liye
  isFooterVisible = false;

  // NEW: Chatbot Popup state
  isChatbotOpen = false;

  // NEW: Chatbot Popup toggle function
  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    // Popup open hone par body scroll ko disable karein
    if (this.isChatbotOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  constructor(private el: ElementRef) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    // Prevent body scrolling when the mobile menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    // Check if the menu is open AND the click is NOT inside the header element
    if (this.isMenuOpen && !this.el.nativeElement.contains(event.target)) {
      // Menu band karo
      this.isMenuOpen = false;
      document.body.style.overflow = 'auto';
    }
    // Agar click hamburger button ya menu ke andar hai, toh isse ignore kar do.
  }

  // Logo zoom function (click par zoom/unzoom hoga)
  zoomLogo() {
    // isLogoZoomed state ko toggle karega
    this.isLogoZoomed = !this.isLogoZoomed;

    // Agar zoom kiya gaya hai, toh 1 second (500ms + 500ms) baad wapas chhota kar de
    if (this.isLogoZoomed) {
      setTimeout(() => {
        this.isLogoZoomed = false;
      }, 1000); // 1 second ke liye zoom rahega
    }
  }

  // This function applies styling to the header only when the window is scrolled
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Header shadow appears after scrolling 10px
    this.isHeaderScrolled = window.scrollY > 10;

    // --- Footer Visibility Logic ---
    // Error icon dikhao jab user page ke bottom 300px ke andar ho
    const scrollPosition = window.scrollY + window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;
    const footerThreshold = 300; // 300px before the end of the page
    this.isFooterVisible = scrollPosition >= totalHeight - footerThreshold;
  }
}
