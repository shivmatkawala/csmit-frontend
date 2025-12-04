import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ApiService, LoginResponse } from '../services/api.service'; // Assuming ApiService exists
import { ResumeService } from '../services/create-resume.service'; // Assuming ResumeService exists
import { catchError, map, tap } from 'rxjs/operators';
import { of, interval, Subscription } from 'rxjs';

// --- Interfaces for Data Models ---
interface ScheduleItem {
  date: string; 
  desc: string;
  type: 'class' | 'meeting' | 'admin' | 'study'; 
  dayOfWeekShort?: string;
  dayOfMonth?: string;
  joinButton?: boolean;
}
interface CalendarDay {
  date: number | string;
  disabled: boolean;
  selected: boolean;
  fullDate: Date | null;
  hasEvent: boolean;
}

interface BatchInfo {
    name: string;
    strength: number;
    timing: string;
    countdown: string;
}

interface TrainerDetails {
    name: string;
    role: string;
    profileUrl: string;
}

// --- CONFIGURATION INTERFACES ---
interface NavLink {
  id: 'dashboard' | 'attendance' | 'performance' | 'assignments' | 'resume';
  label: string;
  icon: string;
}

interface ActionButton {
  label: string;
  icon: string;
}

// --- STATIC UI CONFIG ---
const UI_CONFIG = {
  SEARCH_PLACEHOLDER: "Search Batches, Students, Tasks...",
  // Removed 'Attendance' and 'Performance' from Sidebar Links
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
    { id: 'assignments', label: 'Assignments', icon: 'fas fa-tasks' }
  ] as NavLink[],
  // Restored Quick Actions
  QUICK_ACTIONS: [
    { label: 'Attendance', icon: 'fas fa-user-check' },
    { label: 'Upload Video', icon: 'fas fa-upload' },
    { label: 'New Task', icon: 'fas fa-edit' },
    { label: 'Announce', icon: 'fas fa-bullhorn' },
    { label: 'Performance', icon: 'fas fa-chart-bar' },
    { label: 'Schedule', icon: 'fas fa-calendar-alt' },
    { label: 'Labs', icon: 'fas fa-clipboard-list' },
    { label: 'Chat', icon: 'fas fa-comments' },
  ] as ActionButton[]
};

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerDashboardComponent implements OnInit, OnDestroy {
  // Expose UI Config
  config = UI_CONFIG;

  @ViewChild('fileInput') fileInputRef!: ElementRef;

  // --- State Signals ---
  darkModeActive = signal(false);
  activeTab = signal<'dashboard' | 'attendance' | 'performance' | 'assignments' | 'resume'>('dashboard');
  
  // Realtime Data Signals
  currentTime = signal('');
  greeting = signal('');
  uploadedProfileImage = signal<string | ArrayBuffer | null>(null);
  isLoading = signal(true);

  // --- Trainer Data ---
  trainerDetails: TrainerDetails = {
    name: 'Loading...',
    role: 'Trainer',
    profileUrl: '' 
  };
  
  // Profile Completion State
  isProfileComplete: boolean = false;
  showProfileCompletionModal: boolean = false;
  userId: string | null = null;

  // --- Dynamic Dashboard Data ---
  myBatches: BatchInfo[] = [];
  
  // --- Calendar & Schedule State ---
  today = signal(new Date());
  displayedMonthStart = signal(new Date(this.today().getFullYear(), this.today().getMonth(), 1));
  selectedScheduleDate = signal<Date | null>(this.today());
  calendarDays = signal<CalendarDay[]>([]);
  fullScheduleDetails = signal<ScheduleItem[]>([]);
  scheduleDetails = signal<ScheduleItem[]>([]);
  isLeaveFormOpen = signal(false);

  // Leave Form Fields
  leaveStartDate = signal('');
  leaveEndDate = signal('');
  leaveReason = signal('');

  private timeSubscription?: Subscription;

  // Computed signal for calendar header
  selectedMonthYear = computed(() =>
    this.displayedMonthStart().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private resumeService: ResumeService
  ) {}

  ngOnInit(): void {
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => this.updateClock());

    // Initialize Calendar
    this.populateCalendar(this.displayedMonthStart());
    
    // Fetch Real Data
    this.fetchTrainerDataFromStorage();
  }

  ngOnDestroy(): void {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
  }

  // =========================================================================
  // DATA FETCHING & INITIALIZATION
  // =========================================================================

  private fetchTrainerDataFromStorage(): void {
    this.isLoading.set(true);
    
    // Retrieve User ID from Local Storage
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    this.userId = loginData?.userId || null;

    if (this.userId) {
        let fullName = loginData?.info?.full_name || loginData?.username || 'Trainer';
        const storedData = localStorage.getItem('TRAINER_DATA') || sessionStorage.getItem('TRAINER_DATA');
        
        if (storedData) {
             const parsed = JSON.parse(storedData);
             if (parsed.info && parsed.info.full_name) fullName = parsed.info.full_name;
        }

        this.trainerDetails = {
            name: fullName,
            role: 'Senior Trainer',
            profileUrl: '' 
        };
        
        this.checkProfileCompletion();
        this.fetchDashboardStats();

    } else {
        this.trainerDetails.name = "Guest Trainer";
        this.isLoading.set(false);
    }
  }

  private checkProfileCompletion(): void {
      if (!this.userId) return;

      const isCompleteOnce = (localStorage.getItem('trainer_profile_complete') === 'true');

      if (isCompleteOnce) {
          this.isProfileComplete = true;
          return;
      }

      this.resumeService.getResumeData(this.userId).pipe(
          tap((data: any) => {
              if (data && (data.full_name || data.firstName)) {
                  this.isProfileComplete = true;
                  localStorage.setItem('trainer_profile_complete', 'true');
                  
                  const name = data.full_name || `${data.firstName} ${data.lastName}`;
                  this.trainerDetails.name = name;
                  
                  if (data.profileImageUrl) {
                      this.uploadedProfileImage.set(data.profileImageUrl);
                  }
              } else {
                  this.isProfileComplete = false;
              }
              this.cdr.detectChanges();
          }),
          catchError(err => {
              console.error("Profile check failed", err);
              this.isProfileComplete = false;
              return of(null);
          })
      ).subscribe();
  }

  private fetchDashboardStats(): void {
      setTimeout(() => {
          // 1. Batches Data (Only this remains)
          this.myBatches = [
              { name: 'Full-Stack Batch A', strength: 42, timing: '10:00 AM', countdown: 'Live Now' }
          ];
          
          // 5. Schedule
          this.initializeScheduleData();

          this.isLoading.set(false);
          this.cdr.detectChanges();
      }, 1000); 
  }

  // =========================================================================
  // CLOCK & GREETING
  // =========================================================================
  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }));
    
    const hour = now.getHours();
    let greet = '';
    if (hour >= 5 && hour < 12) greet = 'Good Morning! Ready to teach?';
    else if (hour >= 12 && hour < 17) greet = 'Good Afternoon! Keep the energy up.';
    else if (hour >= 17 && hour < 21) greet = 'Good Evening! Wrapping up soon?';
    else greet = 'Good Night! Time to recharge.';
    this.greeting.set(greet);
  }

  // =========================================================================
  // PROFILE & ACTIONS
  // =========================================================================

  triggerProfileUpload(): void {
    if(this.fileInputRef) this.fileInputRef.nativeElement.click();
  }

  onProfileImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedProfileImage.set(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    }
  }

  goToProfileSetupForm(): void {
    window.location.href = 'create-trainer'; 
  }

  goToResumeView(): void {
      this.activeTab.set('resume');
  }

  // =========================================================================
  // CALENDAR & SCHEDULE LOGIC
  // =========================================================================

  private initializeScheduleData(): void {
    const now = new Date();
    const dummyData: ScheduleItem[] = [
        { date: now.toISOString().slice(0, 10), desc: 'Live Class: Advanced Angular', type: 'class', dayOfWeekShort: 'TODAY', dayOfMonth: now.getDate().toString(), joinButton: true }
    ];
    this.fullScheduleDetails.set(dummyData);
    this.updateDisplayedScheduleDetails();
  }

  populateCalendar(startDate: Date): void {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const newDays: CalendarDay[] = [];

    // Empty slots
    for (let i = 0; i < startDayOfWeek; i++) {
      newDays.push({ date: '', disabled: true, selected: false, fullDate: null, hasEvent: false });
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const isSelected = this.selectedScheduleDate()?.toDateString() === d.toDateString();
      newDays.push({
        date: i, disabled: false, selected: isSelected, fullDate: d, hasEvent: false 
      });
    }
    this.calendarDays.set(newDays);
  }

  navigateCalendar(direction: number): void {
    const newStart = new Date(this.displayedMonthStart());
    newStart.setMonth(newStart.getMonth() + direction);
    this.displayedMonthStart.set(newStart);
    this.selectedScheduleDate.set(null);
    this.populateCalendar(newStart);
  }

  onDateSelect(day: CalendarDay): void {
    if (day.fullDate) {
      this.selectedScheduleDate.set(day.fullDate);
      this.populateCalendar(this.displayedMonthStart()); // Refresh selection UI
      this.updateDisplayedScheduleDetails();
    }
  }

  updateDisplayedScheduleDetails(): void {
    const selected = this.selectedScheduleDate();
    let filtered: ScheduleItem[] = [];
    if (selected) {
        const iso = selected.toISOString().slice(0, 10);
        filtered = this.fullScheduleDetails().filter(i => i.date === iso);
        
        if (filtered.length === 0) {
            filtered.push({ 
                date: iso, desc: 'No events scheduled.', type: 'study', 
                dayOfWeekShort: selected.toLocaleString('en-US', {weekday:'short'}).toUpperCase(),
                dayOfMonth: selected.getDate().toString()
            });
        }
    }
    this.scheduleDetails.set(filtered);
  }

  getScheduleTypeClass(type: ScheduleItem['type']): string {
    switch (type) {
      case 'class': return 'class-item';
      case 'meeting': return 'meeting-item';
      case 'admin': return 'admin-item';
      default: return 'default-item';
    }
  }

  // =========================================================================
  // LEAVE FORM
  // =========================================================================

  openLeaveForm(): void {
    const d = this.selectedScheduleDate() || new Date();
    this.leaveStartDate.set(d.toISOString().slice(0, 10));
    this.isLeaveFormOpen.set(true);
  }

  closeLeaveForm(): void {
    this.isLeaveFormOpen.set(false);
    this.leaveStartDate.set('');
    this.leaveEndDate.set('');
    this.leaveReason.set('');
  }

  submitLeave(): void {
    if (!this.leaveStartDate() || !this.leaveReason()) return;
    this.closeLeaveForm();
  }
}