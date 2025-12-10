import { Component, ChangeDetectionStrategy, signal, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router'; 
import { UserManagementComponent } from './user-management/user-management.component'; // Import UserManagementComponent
import { ManageCourseComponent } from './manage-course/manage-course.component'; // Import new ManageCourseComponent
import { BatchManagementComponent } from './batch-management/batch-management.component'; // Import new BatchManagementComponent
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

// --- Interfaces for Data Models ---

type TabId = 'dashboard' | 'users' | 'courses' | 'batches' | 'settings'; 

interface NavLink {
  id: TabId; 
  label: string;
  icon: string; 
  route: string;
}

interface AdminCard {
  title: string;
  subtitle: string;
  iconImage: string; // Changed from iconSvg to iconImage
  buttonText: string;
  colorClass: string; 
  route: string;
}

// --- HARDCODED CONFIGURATION DATA ---
const ADMIN_CONFIG = {
  SEARCH_PLACEHOLDER: "Search Users, Batches...", 
  HEADER_BUTTON: {
    label: "View Reports", 
    icon: "fas fa-chart-bar"
  },
  ADMIN_DETAILS: {
    name: 'Admin Head',
    role: 'System Administrator',
    profileUrl: 'https://placehold.co/80x80/2C3E50/ffffff?text=AD' 
  },
  // Removed 'settings' link
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large', route: '/admin-panel' }, 
    { id: 'users', label: 'Users', icon: 'fas fa-users', route: '/users' }, 
    { id: 'courses', label: 'Courses', icon: 'fas fa-book-open', route: '/courses' }, 
    { id: 'batches', label: 'Batches', icon: 'fas fa-graduation-cap', route: '/batches' }, 
  ] as NavLink[],
  
  // Updated cards to use image paths
  ADMIN_CARDS: [
    { 
      title: 'Create New User', 
      subtitle: 'Register new users (Admin, Trainer, Student) and assign roles.', 
      iconImage: 'new_user.png', // Using image file name
      buttonText: 'Go to Create User', 
      colorClass: 'indigo', 
      route: '/create-user' 
    },
    { 
      title: 'Update New Batch', 
      subtitle: 'Manage batch start dates, capacity, and student allocations.', 
      iconImage: 'batch.png', // Using image file name
      buttonText: 'Go to Create New Batch', 
      colorClass: 'violet', 
      route: '/create-batch' 
    },
    { 
      title: 'Create New Course', 
      subtitle: 'Define new course structure, duration, and assign a dedicated trainer.', 
      iconImage: 'course.png', // Using image file name
      buttonText: 'Go to Create Course', 
      colorClass: 'violet', 
      route: '/create-course' 
    },
    { 
      title: 'Assign User to Batch', 
      subtitle: 'Map users (Student/Trainer) to specific batches and roles.', 
      iconImage: 'assign-user (1).png', // Using image file name
      buttonText: 'Assign User to Batch', 
      colorClass: 'teal', 
      route: '/assign-user-to-batch' 
    },
    { 
      title: 'Create Exam', 
      subtitle: 'Design, configure, and schedule new tests and assessments.', 
      iconImage: 'exam.png', // Using image file name
      buttonText: 'Go to Create Exam', 
      colorClass: 'amber', 
      route: '/create-exam' 
    },
    { 
      title: 'Upload Jobs', 
      subtitle: 'Post and manage new job openings for ongoing placement drives.', 
      iconImage: 'upload-job.png', // Using image file name
      buttonText: 'Go to Upload Jobs', 
      colorClass: 'red', 
      route: '/upload-job' 
    },
    { 
      title: 'Create Success Stories', 
      subtitle: 'Share student placement stories and achievements on the wall of fame.', 
      iconImage: 'success-story.png', // Make sure to add this image to your assets
      buttonText: 'Add Success Story', 
      colorClass: 'teal', 
      route: '/create-success-story' 
    },
    // New Card Added Here
    { 
      title: 'Upload Blog', 
      subtitle: 'Upload and manage PDF blogs to share with students.', 
      iconImage: 'blog.png', 
      buttonText: 'Go to Upload Blog', 
      colorClass: 'red', 
      route: '/upload-blog' 
    },
  ] as AdminCard[]
};

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit, AfterViewInit {
  config = ADMIN_CONFIG;
  darkModeActive = signal(false);
  activeTab = signal<TabId>('dashboard');
  
  // Global Search Properties for Header (NEW)
  headerSearchQuery = signal<string>(''); 
  private searchTerms = new Subject<string>();
  
  // ViewChild to access child components
  @ViewChild(UserManagementComponent) userManagementComponent!: UserManagementComponent; 
  @ViewChild(ManageCourseComponent) manageCourseComponent!: ManageCourseComponent;
  @ViewChild(BatchManagementComponent) batchManagementComponent!: BatchManagementComponent; // New ViewChild
  

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Set active tab based on URL path on load
    const path = this.router.url.split('?')[0];
    // Check against updated SIDEBAR_LINKS (which no longer contains 'settings')
    const matchingLink = this.config.SIDEBAR_LINKS.find(link => link.route === path);
    if (matchingLink) {
        this.activeTab.set(matchingLink.id);
    }
  }
  
  ngAfterViewInit(): void {
      this.searchTerms.pipe(
          debounceTime(300), 
          distinctUntilChanged() 
      ).subscribe(term => {
          this.headerSearchQuery.set(term);
          const currentTab = this.activeTab();
          
          // Trigger search on the active management tab
          if (currentTab === 'users' && this.userManagementComponent) {
              this.userManagementComponent.triggerExternalSearch();
          } else if (currentTab === 'courses' && this.manageCourseComponent) {
              this.manageCourseComponent.triggerExternalSearch();
          } else if (currentTab === 'batches' && this.batchManagementComponent) { // New condition for batches
              this.batchManagementComponent.triggerExternalSearch();
          }
      });
  }
  
  /**
   * Handles input changes from the main header search bar.
   * @param event The input change event.
   */
  onHeaderSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerms.next(term);
  }

  /**
   * Handles sidebar navigation and updates the active tab signal.
   * @param route The target route.
   * @param tabId The ID of the tab (e.g., 'dashboard', 'users').
   */
  navigateTo(route: string, tabId: TabId): void { 
    this.activeTab.set(tabId);
    
    // Optional: Clear the search when switching away from the current tab
    if (tabId !== this.activeTab() && this.headerSearchQuery() !== '') {
        this.headerSearchQuery.set('');
    }
    
    if (route) {
        this.router.navigate([route]).catch(err => {
            console.error(`Navigation Error: Could not navigate to ${route}. Please ensure this route is configured.`, err);
            this.showMessageBox(`Navigation Error: The route ${route} is not configured.`, 'error');
        });
    } else {
        this.showMessageBox('This action is not configured yet.', 'error');
    }
  }

  // New function for handling logout
  logoutUser(): void {
    // 1. Show message box indicating successful logout
    this.showMessageBox('Logged out successfully. Redirecting to login page...');

    // 2. Perform actual logout logic (e.g., clear tokens, call backend)
    // For demonstration, we use a timeout to simulate a redirect.
    setTimeout(() => {
        // 3. Navigate to the login page
        // this.router.navigate(['/login']); 
        // Showing a console log instead of actual navigation since the login route is unknown
        console.log('Redirecting to /login page...');
    }, 1500); // Wait for the message box to be visible
  }

  // Dashboard general message box logic remains the same
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

  // Removed getIconSvg as we are using <img> now
}