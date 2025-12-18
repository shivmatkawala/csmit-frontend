import { Component, ChangeDetectionStrategy, signal, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router'; 
import { UserManagementComponent } from './user-management/user-management.component'; 
import { ManageCourseComponent } from './manage-course/manage-course.component'; 
import { BatchManagementComponent } from './batch-management/batch-management.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

// Added 'upload-careers' to TabId type to handle the new view
type TabId = 'dashboard' | 'users' | 'courses' | 'batches' | 'settings' | 'upload-careers'; 

interface NavLink {
  id: TabId; 
  label: string;
  icon: string; 
  route: string;
}

interface AdminCard {
  title: string;
  subtitle: string;
  iconImage: string; 
  buttonText: string;
  colorClass: string; 
  route: string;
  targetTab?: TabId; // Optional: If present, clicking card switches to this tab instead of just routing
}

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
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large', route: '/admin-panel' }, 
    { id: 'users', label: 'Users', icon: 'fas fa-users', route: '/users' }, 
    { id: 'courses', label: 'Courses', icon: 'fas fa-book-open', route: '/courses' }, 
    { id: 'batches', label: 'Batches', icon: 'fas fa-graduation-cap', route: '/batches' }, 
  ] as NavLink[],
  
  ADMIN_CARDS: [
    { 
      title: 'Create New User', 
      subtitle: 'Register new users (Admin, Trainer, Student) and assign roles.', 
      iconImage: 'new_user.png',
      buttonText: 'Go to Create User', 
      colorClass: 'indigo', 
      route: '/create-user' 
    },
    { 
      title: 'Update New Batch', 
      subtitle: 'Manage batch start dates, capacity, and student allocations.', 
      iconImage: 'batch.png',
      buttonText: 'Go to Create New Batch', 
      colorClass: 'violet', 
      route: '/create-batch' 
    },
    { 
      title: 'Create New Course', 
      subtitle: 'Define new course structure, duration, and assign a dedicated trainer.', 
      iconImage: 'course.png',
      buttonText: 'Go to Create Course', 
      colorClass: 'violet', 
      route: '/create-course' 
    },
    { 
      title: 'Assign User to Batch', 
      subtitle: 'Map users (Student/Trainer) to specific batches and roles.', 
      iconImage: 'assign-user (1).png',
      buttonText: 'Assign User to Batch', 
      colorClass: 'teal', 
      route: '/assign-user-to-batch' 
    },
    { 
      title: 'Create Exam', 
      subtitle: 'Design, configure, and schedule new tests and assessments.', 
      iconImage: 'exam.png',
      buttonText: 'Go to Create Exam', 
      colorClass: 'amber', 
      route: '/create-exam' 
    },
    
    // --- 1. EXISTING UPLOAD JOBS CARD (Placement Drives) ---
    // Iski functionality same rahegi (Route: /upload-job)
    { 
      title: 'Upload Jobs (Placement)', 
      subtitle: 'Post and manage new job openings for ongoing placement drives.', 
      iconImage: 'upload-job.png', 
      buttonText: 'Go to Upload Jobs', 
      colorClass: 'red', 
      route: '/upload-job' 
    },

    // --- 2. NEW UPLOAD CAREERS CARD (Website) ---
    // Isme 'targetTab' add kiya hai taaki ye naya component open kare
    { 
      title: 'Post Careers (Website)', 
      subtitle: 'Post internal job openings for the main Careers website page.', 
      iconImage: 'career_web.png', // Aap is naam ki image assets me daal sakte hain ya 'upload-job.png' use karein
      buttonText: 'Manage Website Careers', 
      colorClass: 'indigo', 
      route: '/upload-careers',
      targetTab: 'upload-careers' 
    },

    { 
      title: 'Create Success Stories', 
      subtitle: 'Share student placement stories and achievements on the wall of fame.', 
      iconImage: 'success-story.png',
      buttonText: 'Add Success Story', 
      colorClass: 'teal', 
      route: '/create-success-story' 
    },
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
  
  headerSearchQuery = signal<string>(''); 
  private searchTerms = new Subject<string>();
  
  @ViewChild(UserManagementComponent) userManagementComponent!: UserManagementComponent; 
  @ViewChild(ManageCourseComponent) manageCourseComponent!: ManageCourseComponent;
  @ViewChild(BatchManagementComponent) batchManagementComponent!: BatchManagementComponent;

  constructor(private router: Router) { }

  ngOnInit(): void {
    const path = this.router.url.split('?')[0];
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
          
          if (currentTab === 'users' && this.userManagementComponent) {
              this.userManagementComponent.triggerExternalSearch();
          } else if (currentTab === 'courses' && this.manageCourseComponent) {
              this.manageCourseComponent.triggerExternalSearch();
          } else if (currentTab === 'batches' && this.batchManagementComponent) {
              this.batchManagementComponent.triggerExternalSearch();
          }
      });
  }
  
  onHeaderSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerms.next(term);
  }

  // Updated navigateTo to accept optional tabId from card config
  navigateTo(route: string, tabId?: TabId): void { 
    // Agar card me 'targetTab' defined hai (jaise Careers ke liye), toh view switch karo
    if (tabId) {
        this.activeTab.set(tabId);
    }
    
    // Agar search query thi aur hum tab change kar rahe hain, toh clear karo
    if (tabId && tabId !== 'dashboard' && this.headerSearchQuery() !== '') {
        this.headerSearchQuery.set('');
    }
    
    // Routing logic (Purane cards ke liye zaroori hai)
    if (route) {
        this.router.navigate([route]).catch(err => {
            // Agar route nahi mila, lekin humne tab switch kar liya hai, toh error ignore karein
            if (!tabId) console.error(err);
        });
    }
  }

  logoutUser(): void {
    this.showMessageBox('Logged out successfully. Redirecting to login page...');
    setTimeout(() => {
        console.log('Redirecting to /login page...');
    }, 1500); 
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
}