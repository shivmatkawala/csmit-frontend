import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router'; 

// --- Interfaces for Data Models ---

type TabId = 'dashboard' | 'users' | 'courses' | 'settings'; 

interface NavLink {
  id: TabId; 
  label: string;
  icon: string; 
  route: string;
}

interface AdminCard {
  title: string;
  subtitle: string;
  iconSvg: string; 
  buttonText: string;
  colorClass: string; 
  route: string;
}

// --- HARDCODED CONFIGURATION DATA ---
const ADMIN_CONFIG = {
  SEARCH_PLACEHOLDER: "Search Users, Batches, Courses...", 
  HEADER_BUTTON: {
    label: "View Reports", 
    icon: "fas fa-chart-bar"
  },
  ADMIN_DETAILS: {
    name: 'Admin Head',
    role: 'System Administrator',
    profileUrl: 'https://placehold.co/80x80/2C3E50/ffffff?text=AD' 
  },
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large', route: '/' }, 
    { id: 'users', label: 'Users', icon: 'fas fa-users', route: '/users' }, 
    { id: 'courses', label: 'Courses', icon: 'fas fa-book-open', route: '/courses' }, 
    { id: 'settings', label: 'Settings', icon: 'fas fa-cogs', route: '/settings' } 
  ] as NavLink[],
  
  ADMIN_CARDS: [
    { 
      title: 'Create New User', 
      subtitle: 'Register new users (Admin, Trainer, Student) and assign roles.', 
      iconSvg: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 5v-2a4 4 0 0 0-3-3.87M23 3l-3 3-3-3"/>', 
      buttonText: 'Go to Create User', 
      colorClass: 'indigo', 
      route: '/create-user' 
    },
    { 
      title: 'Update New Batch', 
      subtitle: 'Manage batch start dates, capacity, and student allocations.', 
      iconSvg: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>', 
      buttonText: 'Go to Create New Batch', 
      colorClass: 'violet', 
      route: '/create-batch' 
    },
    { 
      title: 'Create New Course', 
      subtitle: 'Define new course structure, duration, and assign a dedicated trainer.', 
      iconSvg: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', 
      buttonText: 'Go to Create Course', 
      colorClass: 'violet', 
      route: '/create-course' 
    },
    { 
      title: 'Assign User to Batch', 
      subtitle: 'Map users (Student/Trainer) to specific batches and roles.', 
      iconSvg: '<path d="M17 17H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M12 7V3"/><path d="M12 21v-4"/>', 
      buttonText: 'Assign User to Batch', 
      colorClass: 'teal', 
      route: '/assign-user-to-batch' 
    },
    { 
      title: 'Create Exam', 
      subtitle: 'Design, configure, and schedule new tests and assessments.', 
      iconSvg: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-7M9 15h3m-3-4h6M22 2l-3 3-3-3"/>', 
      buttonText: 'Go to Create Exam', 
      colorClass: 'amber', 
      route: '/create-exam' 
    },
    { 
      title: 'Upload Jobs', 
      subtitle: 'Post and manage new job openings for ongoing placement drives.', 
      iconSvg: '<path d="M16 4h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4m12 0h-4M4 8h16M2 8l8 5 8-5"/>', 
      buttonText: 'Go to Upload Jobs', 
      colorClass: 'red', 
      route: '/upload-job' 
    },
  ] as AdminCard[]
};

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent {
  config = ADMIN_CONFIG;
  darkModeActive = signal(false);
  activeTab = signal<TabId>('dashboard');

  constructor(private router: Router) { }

  navigateTo(route: string): void {
    if (route) {
        this.router.navigate([route]).catch(err => {
            console.error(`Navigation Error: Could not navigate to ${route}. Please ensure this route is configured.`, err);
            this.showMessageBox(`Navigation Error: The route ${route} is not configured.`, 'error');
        });
    } else {
        this.showMessageBox('This action is not configured yet.', 'error');
    }
  }

  showMessageBox(message: string, type: 'success' | 'error' = 'success'): void {
    const box = document.getElementById('messageBox');
    if (box) {
        const textElement = box.querySelector('p');
        if (textElement) {
            textElement.textContent = message;
        }
        
        box.classList.remove('active', 'error');
        if (type === 'error') {
            box.classList.add('error');
        }
        
        setTimeout(() => {
            box.classList.add('active');
        }, 50);

        setTimeout(() => {
            box.classList.remove('active');
        }, 3000);
    }
  }

  closeMessageBox(): void {
      document.getElementById('messageBox')?.classList.remove('active');
  }

  getIconSvg(card: AdminCard): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${card.iconSvg}</svg>`;
  }
}