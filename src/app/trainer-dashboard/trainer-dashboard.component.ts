import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ApiService, LoginResponse } from '../services/api.service';
import { ResumeService } from '../services/create-resume.service';
import { HttpClient } from '@angular/common/http'; // Added HttpClient for real-time calls
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
  id: 'dashboard' | 'resume';
  label: string;
  icon: string;
}

// --- STATIC UI CONFIG ---
const UI_CONFIG = {
  SEARCH_PLACEHOLDER: "Search Batches, Students...",
  // Removed 'assignments' and 'profile-setting' as requested
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
    { id: 'resume', label: 'Resume', icon: 'fas fa-file-alt' }
  ] as NavLink[]
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
  activeTab = signal<'dashboard' | 'resume'>('dashboard');
  
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
  userId: string | null = null;

  // --- Dynamic Dashboard Data ---
  myBatches = signal<BatchInfo[]>([]);
  
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
    private resumeService: ResumeService,
    private http: HttpClient 
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
        
        // CHECKBOTH: Try to get data from TRAINER_DATA first, then fallback to STUDENT_DATA (as Setup Profile saves there)
        const trainerData = localStorage.getItem('TRAINER_DATA') || sessionStorage.getItem('TRAINER_DATA');
        const studentData = localStorage.getItem('STUDENT_DATA') || sessionStorage.getItem('STUDENT_DATA');
        
        // Prioritize updated data from Setup Profile (which saves to STUDENT_DATA logic in current setup)
        if (studentData) {
             const parsed = JSON.parse(studentData);
             if (parsed.info && parsed.info.full_name) fullName = parsed.info.full_name;
        } else if (trainerData) {
             const parsed = JSON.parse(trainerData);
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

      // Check if profile was completed via the Setup Profile flow (which sets cshub_profile_complete_once)
      const isStudentComplete = (localStorage.getItem('cshub_profile_complete_once') === 'true');
      const isTrainerComplete = (localStorage.getItem('trainer_profile_complete') === 'true');

      if (isStudentComplete || isTrainerComplete) {
          this.isProfileComplete = true;
          // Logic to update name if stored in local storage is already handled in fetchTrainerDataFromStorage
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
      if (!this.userId) {
          this.isLoading.set(false);
          return;
      }

      // --- 1. Real-time Batches Fetch ---
      this.http.get<any[]>(`/api/trainer/${this.userId}/batches`).pipe(
          catchError(err => {
              console.warn('Real-time Batches API failed (using fallback/empty):', err);
              return of([]); // Return empty array on error
          })
      ).subscribe(batches => {
          const mappedBatches: BatchInfo[] = batches.map(b => ({
              name: b.batch_name || 'Unknown Batch',
              strength: b.student_count || 0,
              timing: b.timing || 'N/A',
              countdown: b.status || 'Active'
          }));
          this.myBatches.set(mappedBatches);
      });

      // --- 2. Real-time Schedule Fetch ---
      this.http.get<any[]>(`/api/trainer/${this.userId}/schedule`).pipe(
           catchError(err => {
              console.warn('Real-time Schedule API failed (using fallback/empty):', err);
              return of([]);
           })
      ).subscribe(schedule => {
           const mappedSchedule: ScheduleItem[] = schedule.map(s => ({
               date: s.date, // Expecting YYYY-MM-DD
               desc: s.description,
               type: s.type || 'class',
               dayOfWeekShort: new Date(s.date).toLocaleString('en-US', {weekday:'short'}).toUpperCase(),
               dayOfMonth: new Date(s.date).getDate().toString(),
               joinButton: s.has_link
           }));
           this.fullScheduleDetails.set(mappedSchedule);
           this.updateDisplayedScheduleDetails();
           this.isLoading.set(false);
           this.cdr.detectChanges();
      });
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
  // ACTIONS
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
    window.location.href = 'setup-profile'; 
  }

  goToResumeView(): void {
      this.activeTab.set('resume');
  }

  logout(): void {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'login';
  }

  // =========================================================================
  // CALENDAR & SCHEDULE LOGIC
  // =========================================================================

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
    // Here you would add a real API call to submit leave
    console.log('Submitting Leave:', this.leaveStartDate(), this.leaveEndDate(), this.leaveReason());
    this.closeLeaveForm();
  }
}