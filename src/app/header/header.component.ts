import { Component, HostListener, ElementRef } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  isMenuOpen = false;
  isHeaderScrolled = false;
  isLogoZoomed = false;
  isFooterVisible = false;
  isChatbotOpen = false;

  toggleChatbot() {
    this.isChatbotOpen = !this.isChatbotOpen;
    // Disable/Enable body scroll when the popup is open/closed
    document.body.style.overflow = this.isChatbotOpen ? 'hidden' : 'auto';
  }

  // Closes the chatbot when clicking on the overlay (outside the chat container)
  closeChatbotIfOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.isChatbotOpen && target.classList.contains('chatbot-modal-overlay')) {
      this.toggleChatbot();
    }
  }

  constructor(private el: ElementRef) {}

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    document.body.style.overflow = this.isMenuOpen ? 'hidden' : 'auto';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isMenuOpen && !this.el.nativeElement.contains(event.target)) {
      this.isMenuOpen = false;
      document.body.style.overflow = 'auto';
    }
  }

  zoomLogo() {
    this.isLogoZoomed = !this.isLogoZoomed;
    if (this.isLogoZoomed) {
      setTimeout(() => {
        this.isLogoZoomed = false;
      }, 1000);
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isHeaderScrolled = window.scrollY > 10;

    // Footer Visibility Logic
    const scrollPosition = window.scrollY + window.innerHeight;
    const totalHeight = document.documentElement.scrollHeight;
    const footerThreshold = 300;
    this.isFooterVisible = scrollPosition >= totalHeight - footerThreshold;
  }
}
