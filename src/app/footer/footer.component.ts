import { Component, HostListener, inject } from '@angular/core';
import { UiStateService } from '../services/ui-state.service'; // Import Service

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  
  // Inject Service
  private uiService = inject(UiStateService);

  isScrolled = false;
  isChatOpen = false; 

  constructor() {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  // --- NEW: Handle Link Clicks ---
  handleAction(action: string) {
    // 1. Trigger action via service (Header/Navbar/Section will listen)
    this.uiService.triggerAction(action);

    // 2. Scroll to top if navigation related
    if (action.startsWith('navigate') || action === 'open-courses') {
      this.scrollToTop();
    }
  }
}