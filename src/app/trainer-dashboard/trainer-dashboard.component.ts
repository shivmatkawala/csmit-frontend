import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { interval, Subscription, timer, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { ApiService, StudentBatchDetails, LoginResponse } from '../services/api.service';
import { CreateBatchService } from '../services/create-batch.service';
import { ResumeService } from '../services/create-resume.service';

interface ScheduleItem {
  date: string; 
  desc: string;
  type: 'class' | 'meeting' | 'admin' | 'study';
  dayOfWeekShort?: string;
  dayOfMonth?: string;
  joinButton?: boolean;
}

interface FeatureCard {
  label: string; 
  value: string;
  icon: string;
  color: string; 
  title: string; 
  subText: string; 
  colorClass: string; 
  route: string;
}

export interface TrainerProfileData {
  full_name: string;
  email: string; 
  trainer_id: string; 
  profileImageUrl: string;
  profileInitial: string;
}

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css']
})
export class TrainerDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  activePage: string = 'dashboard';
  loadingDashboardData: boolean = true;
  
  // Clock & Greeting
  currentTime: string = '';
  greeting: string = '';
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  private timeSubscription?: Subscription;

  // Trainer Data
  trainerName: string = 'Loading...';
  trainerId: string = '';
  profileInitial: string = '';
  uploadedProfileImage: string | ArrayBuffer | null = null;
  
  trainerProfileData: TrainerProfileData = {
    full_name: '',
    email: '',
    trainer_id: '',
    profileImageUrl: '',
    profileInitial: ''
  };

  // Logic Variables
  isProfileComplete: boolean = false;
  showProfileCompletionModal: boolean = false;
  
  // Batches & Meetings
  trainerAssignedBatches: StudentBatchDetails[] = [];
  selectedBatchDetails: any[] = [];
  showJoinMeetingModal: boolean = false;

  // Shorts
  shortsList: any[] = [];

  // UI Components
  message: string = '';
  messageType: string = '';

  quickAccessCards: FeatureCard[] = [
    { 
      label: 'Live Sessions', title: 'Class Meeting', value: 'Start Session', 
      icon: 'fas fa-video', color: '#10B981', subText: 'Host live lecture', 
      colorClass: 'stat-blue', route: 'live-sessions' 
    },
    { 
      label: 'AI Practice', title: 'Quenrix AI Lab', value: 'Open Lab', 
      icon: 'fas fa-robot', color: '#F43F5E', subText: 'Review student work', 
      colorClass: 'stat-red', route: 'home' 
    },
    { 
      label: 'Doubt Hub', title: 'Syntax Share', value: 'Resolve Doubts', 
      icon: 'fas fa-comments', color: '#8B5CF6', subText: 'Help your students', 
      colorClass: 'stat-purple', route: 'syntaxshare' 
    }
  ];

  // Calendar
  calendarDays: any[] = [];
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date();
  selectedScheduleDate: Date | null = new Date();
  scheduleDetails: ScheduleItem[] = [];

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private batchService: CreateBatchService,
    private resumeService: ResumeService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // 1. Synchronous UI Setup
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => this.updateClock());
    this.initializeCalendar();
    this.initializeShorts();

    // 2. Fetch Data
    this.fetchTrainerDataFromStorage();
    this.checkProfileCompletion();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  private fetchTrainerDataFromStorage(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData();
    const userId = loginData?.userId;

    if (userId) {
        this.trainerId = userId;
        
        // Load initial name from local storage to prevent flicker
        let fullName = loginData?.info?.full_name || loginData?.username || 'Trainer';
        const storedData = window.localStorage.getItem('STUDENT_DATA');
        if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed.info?.full_name) fullName = parsed.info.full_name;
        }

        this.setTrainerDetails(fullName, userId);

        // Fetch Trainer Batches
        this.apiService.fetchTrainerBatches(this.trainerId).pipe(
            finalize(() => {
                this.loadingDashboardData = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (batches) => {
                this.trainerAssignedBatches = batches;
            },
            error: () => this.showMessage('Error fetching assigned batches.', 'error')
        });
    } else {
        this.setTrainerDetails('Guest Trainer', 'T-GUEST');
        this.loadingDashboardData = false;
    }
  }

  private setTrainerDetails(name: string, id: string): void {
      this.trainerName = name;
      this.trainerId = id;
      this.profileInitial = this.getProfileInitial(name);
      this.trainerProfileData = {
          full_name: name,
          email: '', // Can be fetched if needed
          trainer_id: id,
          profileImageUrl: '',
          profileInitial: this.profileInitial
      };
  }

  // --- Optimized Profile Sync ---
  private checkProfileCompletion(): void {
      if (!this.trainerId) return;

      this.resumeService.getResumeData(this.trainerId).subscribe({
          next: (res: any) => {
              // 1. Construct Name
              let fetchedName = res.full_name;
              if (!fetchedName && (res.firstName || res.lastName)) {
                  fetchedName = `${res.firstName || ''} ${res.lastName || ''}`.trim();
              }

              // 2. Check Completion Status
              this.isProfileComplete = !!fetchedName && res.education?.length > 0;

              // 3. Force Sync Name with Dashboard (Fix for "Noman" issue)
              if (fetchedName) {
                  this.setTrainerDetails(fetchedName, this.trainerId);
                  
                  // Update Storage for next reload
                  const stored = window.localStorage.getItem('STUDENT_DATA');
                  if (stored) {
                      const parsed = JSON.parse(stored);
                      if (!parsed.info) parsed.info = {};
                      parsed.info.full_name = fetchedName;
                      window.localStorage.setItem('STUDENT_DATA', JSON.stringify(parsed));
                  }
                  this.cdr.detectChanges();
              }

              // 4. Show modal only if strictly needed
              const isDismissed = localStorage.getItem('cshub_profile_prompt_dismissed') === 'true';
              if (!this.isProfileComplete && !isDismissed) {
                  this.showProfileCompletionModal = true;
              }
          },
          error: () => console.warn('Resume data not found, using default profile.')
      });
  }

  initializeShorts() {
    this.shortsList = [{ safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/dQw4w9WgXcQ') }];
  }

  openJoinMeetingModal(): void {
      if (this.trainerAssignedBatches.length === 0) {
          this.showMessage('No active batches assigned.', 'warning');
          return;
      }
      this.showJoinMeetingModal = true;
      // Backend already sends 'zoom_join_url' for trainers, no extra fetch needed
      this.selectedBatchDetails = this.trainerAssignedBatches;
      this.cdr.detectChanges();
  }

  joinMeeting(url: string): void {
      if (!url) {
          this.showMessage('Zoom link not configured for this batch.', 'error');
          return;
      }
      window.open(url, '_blank');
  }

  handleQuickCardClick(route: string): void {
    if (route === 'live-sessions') this.openJoinMeetingModal();
    else if (route === 'home') window.location.href = 'home';
    else this.setActivePage(route);
  }

  setActivePage(page: string): void {
    this.activePage = page;
    this.cdr.detectChanges();
  }

  goToResumeView(): void {
      this.setActivePage('generate-resume');
      this.showMessage('Resume Viewer opened.', 'success');
  }

  goToProfileSetupForm(): void {
    window.location.href = 'setup-profile';
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login';
  }

  // --- Utility Methods ---

  private updateClock(): void {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const hour = now.getHours();
    if (hour < 12) this.greeting = 'Good Morning, Trainer!';
    else if (hour < 17) this.greeting = 'Good Afternoon, Trainer!';
    else this.greeting = 'Good Evening, Trainer!';
  }

  getProfileInitial(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  showMessage(msg: string, type: string): void {
    this.message = msg;
    this.messageType = type;
    timer(3000).subscribe(() => this.message = '');
  }

  dismissProfileCompletionModal(): void {
    this.showProfileCompletionModal = false;
    localStorage.setItem('cshub_profile_prompt_dismissed', 'true');
  }

  triggerProfileUpload(): void { this.fileInputRef.nativeElement.click(); }
  onProfileImageSelected(e: any) { /* Image logic */ }
  closeJoinMeetingModal() { this.showJoinMeetingModal = false; }

  // Calendar Logic
  initializeCalendar(): void {
    this.displayedMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.populateCalendar(this.displayedMonthStart);
  }

  populateCalendar(startDate: Date): void {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    this.selectedMonthYear = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    this.calendarDays = [];
    for (let i = 0; i < firstDay; i++) this.calendarDays.push({ date: '', disabled: true });
    for (let i = 1; i <= totalDays; i++) {
        const d = new Date(year, month, i);
        this.calendarDays.push({ date: i, disabled: false, selected: d.toDateString() === new Date().toDateString(), fullDate: d });
    }
  }

  navigateCalendar(dir: number): void {
    this.displayedMonthStart.setMonth(this.displayedMonthStart.getMonth() + dir);
    this.populateCalendar(this.displayedMonthStart);
  }

  onDateSelect(date: Date | null): void {
    if (date) {
        this.selectedScheduleDate = date;
        this.scheduleDetails = [];
    }
  }
}