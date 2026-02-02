import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { interval, Subscription, timer, forkJoin, of, Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService, StudentBatchDetails } from '../services/api.service';
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

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css']
})
export class TrainerDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  activePage: string = 'dashboard';
  currentTime: string = '';
  greeting: string = '';
  message: string = '';
  messageType: string = '';
  
  trainerName: string = 'Loading...';
  trainerId: string = '';
  profileInitial: string = '';
  uploadedProfileImage: string | ArrayBuffer | null = null;
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;

  trainerAssignedBatches: StudentBatchDetails[] = [];
  selectedBatchDetails: any[] = [];
  showJoinMeetingModal: boolean = false;

  quickAccessCards: FeatureCard[] = [
    { 
      label: 'Live Sessions', 
      title: 'Class Meeting', 
      value: 'Start Session', 
      icon: 'fas fa-video', 
      color: '#10B981', 
      subText: 'Host live lecture', 
      colorClass: 'stat-blue', 
      route: 'live-sessions' 
    },
    { 
      label: 'AI Practice', 
      title: 'Quenrix AI Lab', 
      value: 'Open Lab', 
      icon: 'fas fa-robot', 
      color: '#F43F5E', 
      subText: 'Review student work', 
      colorClass: 'stat-red', 
      route: 'home' 
    },
    { 
      label: 'Doubt Hub', 
      title: 'Syntax Share', 
      value: 'Resolve Doubts', 
      icon: 'fas fa-comments', 
      color: '#8B5CF6', 
      subText: 'Help your students', 
      colorClass: 'stat-purple', 
      route: 'syntaxshare' 
    }
  ];

  calendarDays: any[] = [];
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date();
  selectedScheduleDate: Date | null = new Date();
  scheduleDetails: ScheduleItem[] = [];

  private timeSubscription?: Subscription;

  constructor(
    private cdr: ChangeDetectorRef,
    private apiService: ApiService,
    private batchService: CreateBatchService,
    private resumeService: ResumeService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => this.updateClock());
    this.loadTrainerProfile();
    this.initializeCalendar();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  private loadTrainerProfile(): void {
    const loginData = this.apiService.getStoredStudentData();
    const userId = loginData?.userId;

    if (userId) {
        this.trainerId = userId;
        
        // Storage sync logic mirroring student dashboard
        let fullName = loginData?.info?.full_name || loginData?.username || 'Trainer';
        const storedData = window.localStorage.getItem('STUDENT_DATA') || window.sessionStorage.getItem('STUDENT_DATA');
        if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed.info && parsed.info.full_name) {
                fullName = parsed.info.full_name;
            }
        }

        this.trainerName = fullName;
        this.profileInitial = this.getProfileInitial(fullName);

        // Fetch trainer-specific batches
        this.apiService.fetchTrainerBatches(this.trainerId).subscribe({
            next: (batches) => {
                this.trainerAssignedBatches = batches;
                this.cdr.detectChanges();
            },
            error: () => {
                this.showMessage('Error fetching batches.', 'error');
            }
        });
    } else {
        this.trainerName = 'Guest Trainer';
        this.profileInitial = 'T';
    }
  }

  getProfileInitial(fullName: string): string {
    if (!fullName) return 'T';
    const parts = fullName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return fullName[0].toUpperCase();
  }

  goToResumeView(): void {
      this.setActivePage('generate-resume');
      this.showMessage('Resume Viewer opened.', 'success');
  }

  openJoinMeetingModal(): void {
      if (this.trainerAssignedBatches.length === 0) {
          this.showMessage('No active batches assigned.', 'warning');
          return;
      }
      this.showJoinMeetingModal = true;
      this.selectedBatchDetails = this.trainerAssignedBatches;
      this.cdr.detectChanges();
  }

  closeJoinMeetingModal(): void {
      this.showJoinMeetingModal = false;
  }

  joinMeeting(url: string): void {
      if (!url) {
          this.showMessage('Zoom link not available.', 'error');
          return;
      }
      window.open(url, '_blank');
  }

  handleQuickCardClick(route: string): void {
    if (route === 'live-sessions') {
        this.openJoinMeetingModal();
    } else if (route === 'home') {
        window.location.href = 'home';
    } else {
        this.setActivePage(route);
    }
  }

  setActivePage(page: string): void {
    this.activePage = page;
    this.cdr.detectChanges();
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login';
  }

  private updateClock(): void {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) this.greeting = 'Good Morning, Trainer!';
    else if (hour >= 12 && hour < 17) this.greeting = 'Good Afternoon, Trainer!';
    else if (hour >= 17 && hour < 21) this.greeting = 'Good Evening, Trainer!';
    else this.greeting = 'Good Night, Rest Well!';
  }

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

  showMessage(msg: string, type: 'success' | 'error' | 'warning'): void {
    this.message = msg;
    this.messageType = type;
    timer(3000).subscribe(() => this.message = '');
  }

  goToProfileSetupForm(): void {
    window.location.href = 'setup-profile';
  }

  triggerProfileUpload(): void {
    this.fileInputRef.nativeElement.click();
  }

  onProfileImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => this.uploadedProfileImage = e.target?.result || null;
      reader.readAsDataURL(file);
    }
  }
}