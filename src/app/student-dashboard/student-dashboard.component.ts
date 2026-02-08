import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, ViewChild, ElementRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer, Observable, of, throwError, forkJoin } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService, LoginResponse, StudentBatchDetails } from '../services/api.service'; 
import { examAPi } from '../services/createexam.service'; 
import { ResumeService } from '../services/create-resume.service'; 
import { CreateBatchService } from '../services/create-batch.service';
import { catchError, map, switchMap, tap, finalize } from 'rxjs/operators';

// --- Interfaces ---
interface Course {
  title: string;
  progress: number;
  category: string;
  instructor: string;
  code: string;
  colorClass: string;
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
  info?: string; 
}

interface ScheduleItem {
  date: string; 
  desc: string;
  type: 'class' | 'deadline' | 'session' | 'study';
  dayOfWeekShort?: string;
  dayOfMonth?: string;
  joinButton?: boolean;
}

export interface StudentProfileData {
  full_name: string;
  email: string; 
  student_id: string; 
  profileImageUrl: string;
  profileInitial: string;
  profileImagePlaceholder: boolean; 
  courses: Course[];
  featureCards: FeatureCard[]; 
  batchId?: number; 
  courseId?: number; 
}

interface AvailableExam {
  examId: number; 
  examName: string;
  start_datetime: string; 
  end_datetime: string;   
  is_active: boolean;     
  courseid: number; 
  batchid: number;
  subjectid: number;
  batch: { batchId: number, batchName: string }; 
  subject: { subjectid: number, subjectname: string }; 
  durationMinutes: number; 
  totalQuestions: number; 
}

interface FilterCourse {
    course_id: number;
    course_name: string;
}

interface FilterBatch {
    batchid: number;
    batch_name: string;
    course_id: number; 
}

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  
  @ViewChild('fileInput') fileInputRef!: ElementRef;

  loadingDashboardData: boolean = true; 
  searchControl = new FormControl('');
  notificationsEnabled: boolean = true; 

  // --- Page Navigation ---
  activePage: string = 'dashboard'; 
  
  // --- Profile Data ---
  studentProfileData: StudentProfileData = {
    full_name: 'Loading...',
    email: 'loading@example.com',
    student_id: '', 
    profileImageUrl: '',
    profileInitial: '',
    profileImagePlaceholder: true, 
    courses: [],
    featureCards: [], 
    batchId: undefined, 
    courseId: undefined, 
  };

  // --- User & Clock Data ---
  studentName: string = 'Loading...'; 
  profileImageUrl: string = ''; 
  profileInitial: string = ''; 
  uploadedProfileImage: string | ArrayBuffer | null = null;

  greeting: string = '';
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = '';
  todayDate: Date = new Date();
  private timeSubscription?: Subscription;

  // --- Modal & UI State ---
  isProfileComplete: boolean = false; 
  showProfileCompletionModal: boolean = false; 
  showJoinMeetingModal: boolean = false;
  selectedBatchDetails: any[] = []; 

  // --- Feature Cards ---
  quickAccessCards: FeatureCard[] = [
    { label: 'Live Sessions', title: 'Class Meeting', value: 'Join Class', icon: 'fas fa-video', color: '#10B981', subText: 'Click to Join', colorClass: 'stat-blue', route: 'live-sessions' },
    { label: 'Exam Schedule', title: 'Upcoming Exams', value: 'View Exams', icon: 'fas fa-book-open', color: '#F59E0B', subText: 'Loading...', colorClass: 'stat-yellow', route: 'exams' },
    { label: 'AI Practice', title: 'Practice with Quenrix AI', value: 'Practice Now', icon: 'fas fa-robot', color: '#F43F5E', subText: 'Interactive Practice', colorClass: 'stat-red', route: 'home' },
    { label: 'Doubt Support', title: 'Syntax Share', value: 'Ask Doubts', icon: 'fas fa-comments', color: '#8B5CF6', subText: 'Community Support', colorClass: 'stat-purple', route: 'syntaxshare' },
  ];

  // --- Calendar & Schedule ---
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date(); 
  calendarDays: any[] = [];
  fullScheduleDetails: ScheduleItem[] = []; 
  scheduleDetails: ScheduleItem[] = []; 
  selectedScheduleDate: Date | null = null;

  // --- Messaging ---
  message: string = '';
  messageType: 'success' | 'error' | 'warning' | '' = '';
  
  // --- EXAM PROPERTIES ---
  showExamModal: boolean = false; 
  allExams: AvailableExam[] = []; 
  isLoadingExams: boolean = false;
  selectedExamId: number | null = null;
  examToAttend: AvailableExam | null = null; 
  upcomingExams: AvailableExam[] = []; 
  
  // --- Filters (Now Lazy Loaded) ---
  studentAssignedBatches: StudentBatchDetails[] = []; 
  availableCourses: FilterCourse[] = []; 
  availableBatches: FilterBatch[] = []; 
  selectedCourseId: number | null = null; 
  selectedBatchId: number | null = null; 
  studentCoursesForFilter: FilterCourse[] = [];
  studentBatchesForFilter: FilterBatch[] = [];

  shortsList: any[] = [];

  constructor(
      private cdr: ChangeDetectorRef, 
      private apiService: ApiService, 
      private examService: examAPi, 
      private resumeService: ResumeService,
      private batchService: CreateBatchService,
      private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // 1. Initial UI Setup (Synchronous/Fast)
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => this.updateClock());
    this.initCalendarData();
    this.initializeShorts();

    // 2. Targeted Data Fetching (Optimized)
    this.fetchStudentDataFromStorage().subscribe({
      next: () => {
        this.fetchExamsAndFilter();
        this.checkProfileCompletion();
      },
      error: (err) => {
        console.error('Initial Load Failed:', err);
        this.loadingDashboardData = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  loadGlobalFilters(): void {
    if (this.availableCourses.length > 0) return;

    this.examService.fetchCourses().subscribe(courses => {
        this.availableCourses = courses.map((c: any) => ({
            course_id: c.courseid,
            course_name: c.coursename
        }));
        this.updateFilterOptions();
        this.cdr.detectChanges();
    });
  }

  private initCalendarData(): void {
    const now = new Date();
    this.displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    this.fullScheduleDetails = this.createDummySchedule(); 
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = this.todayDate;
    this.updateDisplayedScheduleDetails();
  }

  private fetchStudentDataFromStorage(): Observable<any> {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    const studentId = loginData?.userId;
    this.loadingDashboardData = true; 

    if (!studentId) {
        this.loadingDashboardData = false;
        return of(null);
    }

    this.setProfileInfoFromStorage(loginData);

    return this.apiService.fetchStudentBatches(studentId).pipe(
        tap((batchDetails: StudentBatchDetails[]) => {
            this.studentAssignedBatches = batchDetails || [];
            if (this.studentAssignedBatches.length > 0) {
                const firstBatch = this.studentAssignedBatches[0];
                this.selectedBatchId = firstBatch.batchid;
                this.selectedCourseId = firstBatch.course_id;
                this.updateBatchCard(firstBatch.batch_name);
            }
            this.loadingDashboardData = false;
            this.cdr.detectChanges();
        }),
        catchError(err => {
            this.loadingDashboardData = false;
            return throwError(() => err);
        })
    );
  }

  private setProfileInfoFromStorage(loginData: any): void {
      let fullName = loginData?.info?.full_name || loginData?.username || 'Student'; 
      const stored = window.localStorage.getItem('STUDENT_DATA');
      if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.info?.full_name) fullName = parsed.info.full_name;
      }
      this.studentName = fullName; 
      this.profileInitial = this.getProfileInitial(fullName);
      this.studentProfileData.full_name = fullName;
      this.studentProfileData.student_id = loginData.userId;
  }

  fetchExamsAndFilter(): void {
    this.isLoadingExams = true;
    this.examService.listAllExams().pipe(
        finalize(() => {
            this.isLoadingExams = false;
            this.cdr.detectChanges();
        })
    ).subscribe(exams => {
        this.allExams = (exams as any[]).map(exam => ({
            examId: exam.examid,
            examName: exam.examname,
            start_datetime: exam.start_datetime,
            end_datetime: exam.end_datetime,
            is_active: exam.is_active ?? true,
            courseid: exam.courseid,
            batchid: exam.batchid,
            subjectid: exam.subjectid || 0,
            batch: exam.batch || { batchId: exam.batchid, batchName: `Batch ${exam.batchid}` },
            subject: exam.subject || { subjectid: exam.subjectid || 0, subjectname: 'General' },
            durationMinutes: exam.durationMinutes || 60,
            totalQuestions: exam.totalQuestions || 0
        }));
        
        this.applyExamFiltering();
    });
  }

  private applyExamFiltering(): void {
    const now = new Date().getTime();
    const filtered = this.selectedBatchId 
        ? this.allExams.filter(e => e.batchid === this.selectedBatchId)
        : this.allExams;

    this.upcomingExams = filtered.filter(e => new Date(e.end_datetime).getTime() > now);

    const examCard = this.quickAccessCards.find(c => c.route === 'exams');
    if (examCard) {
        examCard.subText = this.upcomingExams.length > 0 
            ? `Next: ${this.upcomingExams[0].examName}` 
            : 'No exams scheduled';
    }
  }

  updateClock(): void {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    this.todayDate = now;
    this.setGreeting(now.getHours());
  }

  private setGreeting(hour: number): void {
    if (hour < 12) this.greeting = 'Good Morning! Let\'s Code.';
    else if (hour < 17) this.greeting = 'Good Afternoon! Keep Grinding.';
    else this.greeting = 'Good Evening! Final Push.';
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login';
  }

  setActivePage(page: string): void {
    this.activePage = page;
  }

  goToResumeView(): void {
      this.setActivePage('generate-resume');
      this.showMessage('Resume Viewer opened.', 'success');
  }

  joinMeeting(url: string): void {
      if (!url) {
          this.showMessage('Meeting link not available for this batch.', 'error');
          return;
      }
      window.open(url, '_blank');
  }

  handleQuickCardClick(route: string): void {
    if (route === 'live-sessions') this.openJoinMeetingModal();
    else if (route === 'exams') this.openExamModal();
    else if (route === 'home') window.location.href = 'home';
    else this.setActivePage(route);
  }

  openJoinMeetingModal(): void {
    if (this.studentAssignedBatches.length === 0) {
        this.showMessage('No batches assigned.', 'warning');
        return;
    }
    this.showJoinMeetingModal = true;
    this.selectedBatchDetails = [];
    
    const requests = this.studentAssignedBatches.map(b => 
        this.batchService.getBatchesByCourse(b.course_id).pipe(
            map(list => list.find(x => x.batchId === b.batchid)),
            catchError(() => of(null))
        )
    );
    
    forkJoin(requests).subscribe(results => {
        this.selectedBatchDetails = results.filter(r => !!r);
        this.cdr.detectChanges();
    });
  }

  private updateBatchCard(name: string): void {
    const card = this.quickAccessCards.find(c => c.route === 'batches');
    if (card) card.subText = name;
  }

  private getProfileInitial(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  showMessage(msg: string, type: any): void {
    this.message = msg;
    this.messageType = type;
    timer(4000).subscribe(() => this.message = '');
  }

  populateCalendar(start: Date): void {
    this.calendarDays = [];
    this.selectedMonthYear = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const firstDay = new Date(start.getFullYear(), start.getMonth(), 1).getDay();
    for (let i = 0; i < firstDay; i++) this.calendarDays.push({ date: '', disabled: true });
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), i);
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
        this.updateDisplayedScheduleDetails();
    }
  }

  updateDisplayedScheduleDetails(): void {
    if (!this.selectedScheduleDate) return;
    const iso = this.selectedScheduleDate.toISOString().split('T')[0];
    this.scheduleDetails = this.fullScheduleDetails.filter(s => s.date === iso);
    if (this.scheduleDetails.length === 0) {
        this.scheduleDetails = [{ date: iso, desc: 'No scheduled classes. Time for self-study!', type: 'study', dayOfMonth: this.selectedScheduleDate.getDate().toString(), dayOfWeekShort: '---' }];
    }
  }

  private createDummySchedule(): ScheduleItem[] {
    return [
        { date: new Date().toISOString().split('T')[0], desc: 'Regular Batch Session', type: 'class', dayOfMonth: new Date().getDate().toString(), dayOfWeekShort: 'TODAY' }
    ];
  }

  initializeShorts() {
    this.shortsList = [{ safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/dQw4w9WgXcQ') }];
  }

  checkProfileCompletion(): void {
    const userId = this.studentProfileData.student_id;
    if (!userId) return;
    this.resumeService.getResumeData(userId).subscribe({
        next: (res: any) => {
            // Handle cases where name might be split
            let fetchedName = res.full_name;
            if (!fetchedName && (res.firstName || res.lastName)) {
                fetchedName = `${res.firstName || ''} ${res.lastName || ''}`.trim();
            }

            this.isProfileComplete = !!fetchedName && res.education?.length > 0;

            // ✅ Force Update: Sync Dashboard Name with Resume Name if available
            if (fetchedName) {
                this.studentName = fetchedName;
                this.profileInitial = this.getProfileInitial(this.studentName);
                this.studentProfileData.full_name = this.studentName;
                this.cdr.detectChanges(); // Force UI update
                
                // Optional: Update local storage so next reload is faster with correct name
                const stored = window.localStorage.getItem('STUDENT_DATA');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (!parsed.info) parsed.info = {};
                    parsed.info.full_name = this.studentName;
                    window.localStorage.setItem('STUDENT_DATA', JSON.stringify(parsed));
                }
            }

            if (!this.isProfileComplete) this.showProfileCompletionModal = true;
        },
        error: (err) => console.error('Error fetching resume:', err)
    });
  }

  dismissProfileCompletionModal() { this.showProfileCompletionModal = false; }
  goToProfileSetupForm() { window.location.href = 'setup-profile'; }
  triggerProfileUpload() { this.fileInputRef.nativeElement.click(); }
  onProfileImageSelected(e: any) { /* Image handling */ }
  openExamModal() { this.showExamModal = true; this.fetchExamsAndFilter(); }
  closeExamModal() { this.showExamModal = false; }
  closeJoinMeetingModal() { this.showJoinMeetingModal = false; }
  startExam() { /* Start exam logic */ }
  onExamFinished(e: any) { this.activePage = 'dashboard'; }
  updateFilterOptions() { /* Sync dropdowns */ }
}