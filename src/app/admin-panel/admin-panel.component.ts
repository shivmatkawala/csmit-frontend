import { Component, ChangeDetectionStrategy, signal, OnInit, ViewChild, AfterViewInit, inject, computed } from '@angular/core';
import { Router } from '@angular/router'; 
import { UserManagementComponent } from './user-management/user-management.component'; 
import { ManageCourseComponent } from './manage-course/manage-course.component'; 
import { BatchManagementComponent } from './batch-management/batch-management.component';
import { CareerService } from '../services/careers.service'; 
import { InquiryService, InquiryPayload } from '../services/inquiry.service'; 
import { AlertService } from '../services/alert.service'; // Import AlertService
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DatePipe } from '@angular/common';

type TabId = 'dashboard' | 'users' | 'courses' | 'batches' | 'settings' | 'upload-careers' | 'applicants' | 'inquiries'; 

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
  targetTab?: TabId; 
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
    profileUrl: 'https://placehold.co/80x80/4f46e5/ffffff?text=AD' 
  },
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Home', icon: 'fas fa-home', route: '/admin-panel' }, 
    { id: 'users', label: 'Users', icon: 'fas fa-users', route: '/users' }, 
    { id: 'courses', label: 'Courses', icon: 'fas fa-book-open', route: '/courses' }, 
    { id: 'batches', label: 'Batches', icon: 'fas fa-graduation-cap', route: '/batches' }, 
    { id: 'applicants', label: 'Applicants', icon: 'fas fa-file-alt', route: '/applicants' },
    { id: 'inquiries', label: 'Inquiries', icon: 'fas fa-question-circle', route: '/inquiries' },
  ] as NavLink[],
  
  ADMIN_CARDS: [
    { 
      title: 'Create New User', 
      subtitle: 'Register new users (Admin, Trainer, Student) and assign roles.', 
      iconImage: 'new_user.png',
      buttonText: 'Create User', 
      colorClass: 'indigo', 
      route: '/create-user' 
    },
    { 
      title: 'New Batch', 
      subtitle: 'Manage batch start dates, capacity, and student allocations.', 
      iconImage: 'batch.png',
      buttonText: 'Create Batch', 
      colorClass: 'violet', 
      route: '/create-batch' 
    },
    { 
      title: 'New Course', 
      subtitle: 'Define new course structure, duration, and assign a dedicated trainer.', 
      iconImage: 'course.png',
      buttonText: 'Create Course', 
      colorClass: 'violet', 
      route: '/create-course' 
    },
    { 
      title: 'Assign to Batch', 
      subtitle: 'Map users (Student/Trainer) to specific batches and roles.', 
      iconImage: 'assign-user (1).png',
      buttonText: 'Assign Users', 
      colorClass: 'teal', 
      route: '/assign-user-to-batch' 
    },
    { 
      title: 'Create Exam', 
      subtitle: 'Design, configure, and schedule new tests and assessments.', 
      iconImage: 'exam.png',
      buttonText: 'Create Exam', 
      colorClass: 'amber', 
      route: '/create-exam' 
    },
    { 
      title: 'Create Jobs', 
      subtitle: 'Post and manage new job openings for ongoing placement drives.', 
      iconImage: 'upload-job.png', 
      buttonText: 'Manage Jobs', 
      colorClass: 'red', 
      route: '/create-job' 
    },
    { 
      title: 'Post Careers', 
      subtitle: 'Post internal job openings for the main Careers website page.', 
      iconImage: 'career_web.png', 
      buttonText: 'Website Careers', 
      colorClass: 'indigo', 
      route: '/upload-careers',
      targetTab: 'upload-careers' 
    },
    { 
      title: 'Success Stories', 
      subtitle: 'Share student placement stories and achievements on the wall of fame.', 
      iconImage: 'success-story.png',
      buttonText: 'Add Story', 
      colorClass: 'teal', 
      route: '/create-success-story' 
    },
    { 
      title: 'Upload Blog', 
      subtitle: 'Upload and manage PDF blogs to share with students.', 
      iconImage: 'blog.png', 
      buttonText: 'Manage Blog', 
      colorClass: 'red', 
      route: '/upload-blog' 
    },
    { 
      title: 'Upload Notes', 
      subtitle: 'Upload lecture notes, assignments, and study materials.', 
      iconImage: 'notes.png', 
      buttonText: 'Upload Notes', 
      colorClass: 'violet', 
      route: '/upload-notes' 
    }
  ] as AdminCard[]
};

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DatePipe]
})
export class AdminPanelComponent implements OnInit, AfterViewInit {
  config = ADMIN_CONFIG;
  darkModeActive = signal(false);
  activeTab = signal<TabId>('dashboard');
  
  headerSearchQuery = signal<string>(''); 
  private searchTerms = new Subject<string>();
  
  // Applicants Data Signal
  applicantsList = signal<any[]>([]);
  isLoadingApplicants = signal<boolean>(false);

  // Inquiries Data Signals
  inquiriesList = signal<InquiryPayload[]>([]);
  isLoadingInquiries = signal<boolean>(false);
  
  // Filter Signals for Inquiries
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');
  filterCourseName = signal<string>('');

  private careerService = inject(CareerService);
  private inquiryService = inject(InquiryService); 
  private alertService = inject(AlertService); // Inject AlertService

  @ViewChild(UserManagementComponent) userManagementComponent!: UserManagementComponent; 
  @ViewChild(ManageCourseComponent) manageCourseComponent!: ManageCourseComponent;
  @ViewChild(BatchManagementComponent) batchManagementComponent!: BatchManagementComponent;

  // Computed signal for filtering inquiries
  filteredInquiries = computed(() => {
    let data = this.inquiriesList();
    const query = this.headerSearchQuery().toLowerCase();
    const startDate = this.filterStartDate();
    const endDate = this.filterEndDate();
    const courseFilter = this.filterCourseName().toLowerCase();

    // 1. Global Search (Header)
    if (query) {
      data = data.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.email?.toLowerCase().includes(query) ||
        item.phone_number.includes(query)
      );
    }

    // 2. Course Name Filter
    if (courseFilter) {
      data = data.filter(item => item.course_name.toLowerCase().includes(courseFilter));
    }

    // 3. Date Range Filter
    if (startDate) {
      data = data.filter(item => item.created_at && new Date(item.created_at) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      data = data.filter(item => item.created_at && new Date(item.created_at) < end);
    }

    return data;
  });

  constructor(private router: Router) { }

  ngOnInit(): void {
    const path = this.router.url.split('?')[0];
    const matchingLink = this.config.SIDEBAR_LINKS.find(link => link.route === path);
    if (matchingLink) {
        this.activeTab.set(matchingLink.id);
        
        if (matchingLink.id === 'applicants') {
          this.fetchApplicants();
        } else if (matchingLink.id === 'inquiries') {
          this.fetchInquiries();
        }
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

  navigateTo(route: string, tabId?: TabId): void { 
    if (tabId) {
        this.activeTab.set(tabId);
        
        if (tabId === 'applicants') {
          this.fetchApplicants();
        } else if (tabId === 'inquiries') {
          this.fetchInquiries();
        }
    }
    
    if (tabId && tabId !== 'dashboard' && this.headerSearchQuery() !== '') {
        this.headerSearchQuery.set('');
    }
    
    if (route && route !== '/applicants' && route !== '/inquiries') { 
        this.router.navigate([route]).catch(err => {
            if (!tabId) console.error(err);
        });
    }
  }

  // --- FETCHERS ---

  fetchApplicants() {
    this.isLoadingApplicants.set(true);
    this.careerService.getApplicants().subscribe({
      next: (data) => {
        this.applicantsList.set(data);
        this.isLoadingApplicants.set(false);
      },
      error: (err) => {
        console.error("Failed to fetch applicants", err);
        this.isLoadingApplicants.set(false);
        this.alertService.error("Failed to load applicants data.");
      }
    });
  }

  fetchInquiries() {
    this.isLoadingInquiries.set(true);
    this.inquiryService.getInquiries().subscribe({
      next: (data) => {
        this.inquiriesList.set(data);
        this.isLoadingInquiries.set(false);
      },
      error: (err) => {
        console.error("Failed to fetch inquiries", err);
        this.isLoadingInquiries.set(false);
        this.alertService.error("Failed to load inquiries.");
      }
    });
  }

  // --- DELETE ACTIONS ---

  deleteInquiry(id: number | undefined) {
    if (id === undefined || id === null) {
      this.alertService.error("Error: Cannot delete item with missing ID");
      return;
    }

    // Use AlertService confirm instead of browser confirm
    this.alertService.confirm('Are you sure?', 'You want to delete this inquiry?')
      .then((result) => {
        if (result.isConfirmed) {
            this.inquiryService.deleteInquiry(id).subscribe({
                next: () => {
                    this.alertService.success("Inquiry deleted successfully");
                    this.fetchInquiries(); 
                },
                error: () => this.alertService.error("Failed to delete inquiry")
            });
        }
      });
  }

  deleteAllData() {
    this.alertService.confirm('DANGER!', 'This will delete ALL inquiry records. This action cannot be undone!', 'Yes, delete all!')
      .then((result) => {
        if (result.isConfirmed) {
            this.inquiryService.deleteAllInquiries().subscribe({
                next: () => {
                    this.alertService.success("All inquiries deleted");
                    this.fetchInquiries();
                },
                error: () => this.alertService.error("Failed to delete all records")
            });
        }
      });
  }

  deleteByDateRange() {
    const start = this.filterStartDate();
    const end = this.filterEndDate();
    
    if(!start || !end) {
        this.alertService.warning("Please select both From and To dates");
        return;
    }

    this.alertService.confirm('Delete Range?', `Delete inquiries from ${start} to ${end}?`)
      .then((result) => {
        if (result.isConfirmed) {
            this.inquiryService.deleteInquiriesByDate(start, end).subscribe({
                next: (res: any) => {
                    this.alertService.success(res.message || "Inquiries deleted in range");
                    this.fetchInquiries();
                },
                error: () => this.alertService.error("Failed to delete range")
            });
        }
      });
  }

  // Demo action for "Mark as Contacted"
  markAsContacted() {
      this.alertService.success('Marked as contacted (Demo)', 'Done');
  }


  // --- ACTIONS ---

  resetFilters() {
    this.filterStartDate.set('');
    this.filterEndDate.set('');
    this.filterCourseName.set('');
    this.headerSearchQuery.set('');
  }

  logoutUser(): void {
    this.alertService.success('Logged out successfully. Redirecting...', 'Goodbye');
    
    setTimeout(() => {
        this.router.navigate(['/login']); 
    }, 1500); 
  }
}