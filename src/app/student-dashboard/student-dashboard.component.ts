import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, ViewChild, ElementRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer, Observable, of, throwError, forkJoin } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService, LoginResponse, StudentBatchDetails } from '../services/api.service'; 
import { examAPi } from '../services/createexam.service'; 
import { ResumeService } from '../services/create-resume.service'; 
import { catchError, map, switchMap, tap } from 'rxjs/operators';

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

interface BatchDetailsModal {
    batchid: number;
    batch_name: string;
    course_name: string; 
    course_id: number;
    num_students: number; 
    status: string; 
    description: string;
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
    student_id: 'STU-0000', 
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
  profileImagePlaceholder: boolean = true; 
  profileInitial: string = ''; 
  uploadedProfileImage: string | ArrayBuffer | null = null;

  greeting: string = '';
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = '';
  todayDate: Date = new Date();
  private timeSubscription?: Subscription;

  // --- Modal Properties ---
  isProfileComplete: boolean = false; 
  showProfileCompletionModal: boolean = false; 
  showBatchModal: boolean = false; 
  selectedBatchDetails: BatchDetailsModal[] = []; 

  // --- Feature Cards ---
  quickAccessCards: FeatureCard[] = [
    { 
      label: 'Batches Status', 
      title: 'My Batches', 
      value: 'View Batch', 
      icon: 'fas fa-users', 
      color: '#4338CA', 
      info: 'Loading Batch Status...', 
      subText: 'Loading Batch Status...', 
      colorClass: 'stat-blue', 
      route: 'batches' 
    },
    { 
      label: 'Exam Schedule', 
      title: 'Upcoming Exams', 
      value: 'View Exams', 
      icon: 'fas fa-book-open', 
      color: '#F59E0B', 
      info: 'Next Exam: Loading...', 
      subText: 'Next Exam: Loading...', 
      colorClass: 'stat-yellow', 
      route: 'exams' 
    },
    { 
      label: 'Assignment Submissions', 
      title: 'Assignments', 
      value: 'View Tasks', 
      icon: 'fas fa-tasks', 
      color: '#10B981', 
      info: 'Loading Assignments...', 
      subText: 'Loading Assignments...', 
      colorClass: 'stat-green', 
      route: 'assignments' 
    },
    { 
      label: 'Fee Status', 
      title: 'Payment Details', 
      value: 'View Payments', 
      icon: 'fas fa-receipt', 
      color: '#F43F5E', 
      info: 'Loading Payment Details...', 
      subText: 'Loading Payment Details...', 
      colorClass: 'stat-red', 
      route: 'payments' 
    },
  ];

  courses: Course[] = []; 
  nextDeadlines: ScheduleItem[] = []; 

  // --- Calendar ---
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date(); 
  calendarDays: { date: number | string; disabled: boolean; selected: boolean; fullDate: Date | null }[] = [];
  fullScheduleDetails: ScheduleItem[] = []; 
  scheduleDetails: ScheduleItem[] = []; 
  selectedScheduleDate: Date | null = null;

  // --- Assignments ---
  showAssignmentModal: boolean = false; 
  assignmentTitleControl = new FormControl('', Validators.required);
  assignmentDetailsControl = new FormControl('');
  message: string = '';
  messageType: 'success' | 'error' | 'warning' | '' = '';
  
  // --- EXAM PROPERTIES ---
  showExamModal: boolean = false; 
  allExams: AvailableExam[] = []; 
  activeExams: AvailableExam[] = []; 
  isLoadingExams: boolean = true;
  selectedExamId: number | null = null;
  examToAttend: AvailableExam | null = null; 
  upcomingExams: AvailableExam[] = []; 
  expiredExams: AvailableExam[] = []; 
  attendedExams: AvailableExam[] = []; 
  
  // --- Filters ---
  studentAssignedBatches: StudentBatchDetails[] = []; 
  availableCourses: FilterCourse[] = []; 
  availableBatches: FilterBatch[] = []; 

  selectedCourseId: number | null = null; 
  selectedBatchId: number | null = null; 
  
  // FIX: Explicitly defined arrays to solve "Property does not exist" error
  studentCoursesForFilter: FilterCourse[] = [];
  studentBatchesForFilter: FilterBatch[] = [];

  shortsList: any[] = [];

  constructor(
      private cdr: ChangeDetectorRef, 
      private apiService: ApiService, 
      private examService: examAPi, 
      private resumeService: ResumeService,
      private sanitizer: DomSanitizer
  ) {}

  get selectedExam(): AvailableExam | undefined {
      if (this.selectedExamId === null) {
          return undefined;
      }
      return this.activeExams.find(e => e.examId === this.selectedExamId); 
  }

  // =========================================================================
  // LIFECYCLE HOOKS
  // =========================================================================

  ngOnInit(): void {
    // 1. Load Filter Data
    this.fetchCoursesAndBatchesForFilter().subscribe({
      next: () => {
        // 2. Load Student Data
        this.fetchStudentDataFromStorage().subscribe(() => {
            this.checkProfileCompletion();
        });
      },
      error: () => {
        this.fetchStudentDataFromStorage().subscribe(() => {
            this.checkProfileCompletion();
        });
      }
    });

    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateClock();
    });

    const now = new Date();
    this.displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    this.fullScheduleDetails = this.createDummySchedule(); 
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = this.todayDate;
    this.updateDisplayedScheduleDetails();
    
    this.initializeShorts();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  initializeShorts() {
    const rawShorts = [
        { title: 'Angular Tips', url: 'https://www.youtube.com/embed/placeholder1', likes: '1.2k', comments: '100', channel: 'CodeMaster' },
        { title: 'CSS Tricks', url: 'https://www.youtube.com/embed/placeholder2', likes: '850', comments: '50', channel: 'WebDev' },
        { title: 'TypeScript Basics', url: 'https://www.youtube.com/embed/placeholder3', likes: '2k', comments: '200', channel: 'JSWorld' }
    ];

    this.shortsList = rawShorts.map(short => ({
        ...short,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(short.url)
    }));
  }

  triggerProfileUpload(): void {
    this.fileInputRef.nativeElement.click();
  }

  onProfileImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.uploadedProfileImage = e.target?.result || null;
            this.showMessage('Profile picture updated temporarily!', 'success');
        };
        reader.readAsDataURL(file);
    }
  }
  
  private createDummySchedule(): ScheduleItem[] {
    const data: ScheduleItem[] = [
        { date: '2025-11-04', desc: 'Daily Standup Meeting', type: 'session', dayOfWeekShort: 'MON', dayOfMonth: '04', joinButton: true },
        { date: '2025-11-05', desc: 'CS501 Assignment 5 Submission', type: 'deadline', dayOfWeekShort: 'TUE', dayOfMonth: '05' },
        { date: '2025-11-06', desc: 'Live Class: Advanced Angular', type: 'class', dayOfWeekShort: 'WED', dayOfMonth: '06', joinButton: true },
        { date: '2025-11-08', desc: 'IT402 Week 9 Quiz', type: 'deadline', dayOfWeekShort: 'FRI', dayOfMonth: '08' },
        { date: '2025-11-10', desc: 'Self Study: Data Structures', type: 'study', dayOfWeekShort: 'SUN', dayOfMonth: '10' },
        { date: '2025-11-12', desc: 'IT303 Project Proposal', type: 'deadline', dayOfWeekShort: 'TUE', dayOfMonth: '12' },
        { date: '2025-11-13', desc: 'Doubt Clearing Session', type: 'session', dayOfWeekShort: 'WED', dayOfMonth: '13', joinButton: true },
    ];
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // =========================================================================
  // DATA FETCHING METHODS
  // =========================================================================

  private fetchStudentDataFromStorage(): Observable<any> {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    const studentId = loginData?.userId;
    
    this.loadingDashboardData = true; 
    this.cdr.detectChanges(); 

    const setDefaultFilters = (fallbackId: number, fallbackName: string) => {
        this.selectedCourseId = fallbackId;
        this.selectedBatchId = fallbackId;
        this.studentProfileData = {
            ...this.studentProfileData,
            batchId: fallbackId,
            courseId: fallbackId
        };
        this.updateBatchCard(fallbackName, true);
        this.updateFilterOptions(); // Update filters on fallback
        this.showMessage('Batch/Course data missing. Using defaults.', 'warning');
    };
    
    if (studentId) {
      let fullName = loginData?.info?.full_name || loginData?.username || 'Student'; 
      const storedStudentData = window.sessionStorage.getItem('STUDENT_DATA');
      if (storedStudentData) {
          const storedInfo = JSON.parse(storedStudentData).info;
          if (storedInfo && storedInfo.full_name) {
              fullName = storedInfo.full_name;
          }
      }

      const email = loginData?.info?.email || loginData?.username || 'johndoe@university.edu';
      const initial = this.getProfileInitial(fullName);
      
      this.studentName = fullName; 
      this.profileInitial = initial; 
      this.profileImagePlaceholder = true; 
      
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: fullName,
          email: email, 
          student_id: studentId, 
          profileInitial: initial,
          featureCards: this.quickAccessCards.map(card => ({
              ...card,
              label: card.title, 
              info: card.subText,
          }))
      };
      
      return this.apiService.fetchStudentBatches(studentId).pipe(
          tap((batchDetails: StudentBatchDetails[]) => {
              if (batchDetails && batchDetails.length > 0) {
                  this.studentAssignedBatches = batchDetails;
                  const firstBatch = batchDetails[0];
                  this.updateBatchCard(firstBatch.batch_name);
                  
                  this.studentProfileData = {
                      ...this.studentProfileData,
                      batchId: firstBatch.batchid, 
                      courseId: firstBatch.course_id 
                  };
                  this.selectedBatchId = firstBatch.batchid;
                  this.selectedCourseId = firstBatch.course_id;
              } else {
                  setDefaultFilters(1, 'No Assigned Batch');
              }
              this.updateFilterOptions(); // Update filters after loading data
              this.loadingDashboardData = false;
              this.cdr.detectChanges(); 
              this.fetchExamsAndFilter(); 
          }),
          catchError((error) => {
              console.error('Error fetching student batches:', error);
              setDefaultFilters(1, 'API Error Fallback');
              this.loadingDashboardData = false;
              this.cdr.detectChanges();
              this.fetchExamsAndFilter(); 
              return of(null); 
          })
      );
    } else {
      this.studentName = 'Guest User';
      this.profileInitial = this.getProfileInitial(this.studentName);
      this.profileImagePlaceholder = true;
      setDefaultFilters(9999, 'No User Logged In'); 
      this.loadingDashboardData = false;
      this.showMessage('User ID not found. Showing Guest content.', 'error');
      
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: this.studentName,
          email: 'guest@university.edu',
          student_id: 'STU-0000',
          profileInitial: this.profileInitial,
          featureCards: this.quickAccessCards.map(card => ({
              ...card,
              label: card.title, 
              info: card.subText,
          }))
      };
      this.updateFilterOptions();
      this.cdr.detectChanges(); 
      this.fetchExamsAndFilter(); 
      return of(null); 
    }
  }

  getProfileInitial(fullName: string): string {
    if (!fullName) return 'U'; 
    const parts = fullName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName[0].toUpperCase();
  }
  
  private updateBatchCard(batchName: string, isFallback: boolean = false): void {
      const batchCard = this.quickAccessCards.find(card => card.route === 'batches');
      if (batchCard) {
          let batchInfo = batchName;
          if (this.studentAssignedBatches.length > 1) {
             batchInfo = `${batchName} (and ${this.studentAssignedBatches.length - 1} more)`;
          } else if (this.studentAssignedBatches.length === 1) {
             batchInfo = `${batchName} (1 Batch)`;
          } else if (isFallback) {
             batchInfo = `${batchName} (No Assignment Found)`;
          }
          batchCard.value = batchName; 
          batchCard.subText = batchInfo;
          batchCard.info = batchInfo; 
          this.cdr.detectChanges();
      }
  }

  private checkProfileCompletion(): void {
      const loginData = this.apiService.getStoredStudentData();
      const userId = loginData?.userId;
      const isCompleteOnce = sessionStorage.getItem('cshub_profile_complete_once') === 'true'; 
      
      if (!userId || isCompleteOnce) {
          this.isProfileComplete = isCompleteOnce; 
          return;
      }
      
      this.resumeService.getResumeData(userId).pipe(
          map(resume => {
              this.isProfileComplete = !!resume && resume.full_name !== 'Not Found' && !!resume.full_name && !!resume.email && (resume.education?.length > 0);
              if (this.isProfileComplete) {
                   sessionStorage.setItem('cshub_profile_complete_once', 'true');
              }
          }),
          catchError(error => {
              this.isProfileComplete = false;
              return of(null);
          })
      ).subscribe(() => {
          if (!this.isProfileComplete && sessionStorage.getItem('cshub_profile_prompt_dismissed') !== 'true') {
              this.showProfileCompletionModal = true;
          }
          this.cdr.detectChanges();
      });
  }

  dismissProfileCompletionModal(): void {
      this.showProfileCompletionModal = false;
      sessionStorage.setItem('cshub_profile_prompt_dismissed', 'true');
  }

  // =========================================================================
  // NAVIGATION
  // =========================================================================
  
  setActivePage(page: string): void {
    const validPages = ['dashboard', 'courses', 'assignments', 'career', 'profile', 'profile-setting', 'attend-exam', 'generate-resume', 'shorts'];
    if (validPages.includes(page)) {
      this.activePage = page;
      this.clearMessage();
    } else {
      this.showMessage(`Invalid page requested: ${page}`, 'error');
    }
  }
  
  handleQuickCardClick(route: string): void {
      switch (route) {
          case 'batches':
              this.openBatchModal();
              break;
          case 'exams':
              // Opens the Exam Modal when clicking "View Exams" on the dashboard card
              this.openExamModal(); 
              break;
          case 'assignments':
              this.setActivePage('assignments'); 
              break;
          case 'payments':
              this.showMessage('Navigating to Payment Details page...', 'warning');
              break;
          default:
              this.showMessage(`Feature route "${route}" is not yet implemented.`, 'warning');
              break;
      }
  }
  
  goToProfileSetupForm(): void {
    this.dismissProfileCompletionModal(); 
    this.showMessage('Redirecting to Profile Setup...', 'success');
    window.location.href = 'create-student'; 
  }

  goToResumeView(): void {
      this.setActivePage('generate-resume');
      this.showMessage('Resume Viewer opened.', 'success');
  }
  
  goToProfileSetup(): void {
      this.goToProfileSetupForm();
  }

  // =========================================================================
  // MODAL/MESSAGE LOGIC
  // =========================================================================
  
  openAssignmentModal(): void {
    this.showAssignmentModal = true;
    this.assignmentTitleControl.setValue('');
    this.assignmentDetailsControl.setValue('');
  }

  closeAssignmentModal(): void {
    this.showAssignmentModal = false;
  }

  submitAssignment(): void {
    if (this.assignmentTitleControl.valid) {
      this.showMessage(`Assignment submitted successfully!`, 'success');
      this.closeAssignmentModal();
    } else {
      this.showMessage('Please provide an assignment title.', 'warning');
    }
  }

  openBatchModal(): void {
      if (this.loadingDashboardData) {
          this.showMessage('Please wait, dashboard data is loading...', 'warning');
          return;
      }
      
      if (this.studentAssignedBatches.length === 0) {
          this.showMessage('No batches assigned.', 'warning');
          return;
      }
      
      this.selectedBatchDetails = this.studentAssignedBatches.map(batch => {
          const course = this.availableCourses.find(c => c.course_id === batch.course_id);
          return {
              batchid: batch.batchid,
              batch_name: batch.batch_name,
              course_name: course ? course.course_name : `Course ID ${batch.course_id}`,
              course_id: batch.course_id,
              num_students: Math.floor(Math.random() * (60 - 30 + 1)) + 30, 
              status: 'Active', 
              description: `Batch for ${course?.course_name || 'Assigned Course'}.`
          } as BatchDetailsModal; 
      });
      
      this.showBatchModal = true;
      this.cdr.detectChanges();
  }
  
  closeBatchModal(): void {
      this.showBatchModal = false;
      this.selectedBatchDetails = [];
  }
  
  openExamModal(): void {
    if (this.loadingDashboardData) {
        this.showMessage('Please wait, dashboard data is loading...', 'warning');
        return;
    }
    // Ensures modal opens and re-filters exams just in case
    this.showExamModal = true;
    this.selectedExamId = null; 
    this.fetchExamsAndFilter();
    this.cdr.detectChanges(); 
  }

  closeExamModal(): void {
    this.showExamModal = false;
  }
  
  startExam(): void {
    // 1. Validate Selection
    if (!this.selectedExamId) {
        this.showMessage('Please select an exam to start.', 'warning');
        return;
    }
    
    // 2. Find Exam Details
    const examDetails = this.allExams.find(e => e.examId === this.selectedExamId);
    
    if (!examDetails) {
        this.showMessage('Error finding exam details. Please try again.', 'error');
        return;
    }

    // 3. Set State for Exam Component
    this.examToAttend = examDetails;
    this.showMessage(`Starting Exam: ${examDetails.examName}`, 'success');
    
    // 4. Close Modal and Switch Page
    this.closeExamModal();
    this.activePage = 'attend-exam'; 
    this.cdr.detectChanges(); 
  }

  onExamFinished(event: { status: 'submitted' | 'expired', message: string }): void {
      this.showMessage(event.message, event.status === 'submitted' ? 'success' : 'warning');
      this.examToAttend = null; 
      this.activePage = 'dashboard';
      this.cdr.detectChanges();
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.message = message;
    this.messageType = type;
    timer(5000).subscribe(() => {
      this.clearMessage();
    });
  }

  clearMessage(): void {
    this.message = '';
    this.messageType = '';
  }

  // --- Clock/Calendar Logic ---
  private updateClock(): void {
    const now = new Date();
    this.currentDayOfWeek = now.toLocaleString('en-US', { weekday: 'long' });
    this.currentMonth = now.toLocaleString('en-US', { month: 'long' });
    this.currentDay = now.getDate();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    this.todayDate = now;
    this.updateGreeting(now);
  }

  private updateGreeting(now: Date): void {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) this.greeting = 'Good Morning! Let\'s Code.';
    else if (hour >= 12 && hour < 17) this.greeting = 'Good Afternoon! Keep Grinding.';
    else if (hour >= 17 && hour < 21) this.greeting = 'Good Evening! Final Push.';
    else this.greeting = 'Good Night! Rest Up.';
  }

  populateCalendar(startDate: Date): void {
    this.calendarDays = [];
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    this.selectedMonthYear = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); 
    const daysInMonth = lastDayOfMonth.getDate();
    for (let i = 0; i < startDayOfWeek; i++) {
      this.calendarDays.push({ date: '', disabled: true, selected: false, fullDate: null });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDay = new Date(year, month, i);
      const isToday = currentDay.toDateString() === today.toDateString();
      this.calendarDays.push({
        date: i,
        disabled: false,
        selected: isToday,
        fullDate: currentDay
      });
    }
  }

  navigateCalendar(direction: number): void {
    const newMonthStart = new Date(this.displayedMonthStart);
    newMonthStart.setMonth(newMonthStart.getMonth() + direction);
    this.displayedMonthStart = newMonthStart;
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = null; 
    this.clearMessage();
    this.updateDisplayedScheduleDetails();
  }

  onDateSelect(fullDate: Date | null): void {
    if (fullDate) {
      this.selectedScheduleDate = fullDate;
      this.clearMessage();
      this.updateDisplayedScheduleDetails();
    }
  }

  private updateDisplayedScheduleDetails(): void {
    if (this.selectedScheduleDate) {
      const targetDateISO = this.selectedScheduleDate.toISOString().slice(0, 10);
      this.scheduleDetails = this.fullScheduleDetails.filter(item => item.date === targetDateISO);
    } else {
      this.scheduleDetails = this.fullScheduleDetails.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === this.displayedMonthStart.getFullYear() &&
               itemDate.getMonth() === this.displayedMonthStart.getMonth();
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    if (this.selectedScheduleDate && this.scheduleDetails.length === 0) {
        const dateISO = this.selectedScheduleDate.toISOString().slice(0, 10);
        const d = new Date(dateISO);
        const dayOfWeekShort = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        const dayOfMonth = d.getDate().toString();
        this.scheduleDetails.push({
            date: dateISO,
            desc: 'No Classes or Deadlines Today! Go for Self Study.',
            type: 'study',
            dayOfWeekShort,
            dayOfMonth
        });
    }
    this.cdr.detectChanges();
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#10b981'; 
    if (progress >= 50) return '#f59e0b'; 
    return '#ef4444'; 
  }
  
  // --- Exam/Filter Logic ---
  fetchCoursesAndBatchesForFilter(): Observable<any> {
    return this.examService.fetchCourses().pipe(
        switchMap((courses: any[]) => {
            this.availableCourses = courses.map(c => ({
                course_id: c.courseid,
                course_name: c.coursename
            }));
            const batchRequests = courses.map(c => 
                this.examService.fetchBatches(c.courseid).pipe(
                    map((batches: any[]) => batches.map(b => ({
                        batchid: b.batchId,
                        batch_name: b.name,
                        course_id: c.courseid 
                    })))
                )
            );
            return forkJoin(batchRequests).pipe(
                map(allBatchesArrays => allBatchesArrays.flat())
            );
        }),
        tap((allBatches: FilterBatch[]) => {
            this.availableBatches = allBatches;
            this.updateFilterOptions(); // Update options when data loads
            this.cdr.detectChanges(); 
        }),
        catchError((error) => {
            console.error('Error fetching courses/batches for filter:', error);
            this.showMessage('Error loading course/batch options.', 'error');
            return throwError(() => new Error('Filter data failed.')); 
        })
    );
  }

  fetchAllActiveExams(): Observable<AvailableExam[]> {
    this.isLoadingExams = true;
    this.cdr.detectChanges();
    return this.examService.listAllExams().pipe(
        map((response: any[]) => {
            return response
                .map(exam => ({
                    examId: exam.examid,
                    examName: exam.examname,
                    start_datetime: exam.start_datetime, 
                    end_datetime: exam.end_datetime,     
                    is_active: exam.is_active,           
                    courseid: exam.courseid,
                    batchid: exam.batchid, 
                    subjectid: exam.subjectid,
                    batch: { 
                        batchId: exam.batchid, 
                        batchName: exam.batch?.batchName || `Batch ${exam.batchid}` 
                    },
                    subject: { 
                        subjectid: exam.subjectid, 
                        subjectname: exam.subject?.subjectname || `Subject ID ${exam.subjectid}` 
                    },
                    durationMinutes: exam.durationMinutes || 60,
                    totalQuestions: exam.totalQuestions || 20 
                }))
                .filter((exam: AvailableExam) => exam.examId !== null && exam.examId !== undefined); 
        }),
        catchError((error) => {
            console.error('Global Exam list fetch failed:', error);
            this.showMessage('Error fetching exams.', 'error');
            return of([]); 
        })
    );
  }
  
  fetchExamsAndFilter(): void {
    this.isLoadingExams = true;
    this.selectedExamId = null;
    this.cdr.detectChanges();
    // Always fetch fresh exams or ensure list is populated
    this.fetchAllActiveExams().subscribe(exams => {
        this.allExams = exams;
        this.applyExamFilter();
    });
  }

  applyExamFilter(): void {
    // 1. Update batch dropdown based on new course selection
    this.updateFilterOptions();

    const courseId = this.selectedCourseId;
    const batchId = this.selectedBatchId;
    
    // 2. Filter Exams
    if (this.allExams.length > 0) {
         if (courseId && batchId) {
             this.activeExams = this.allExams.filter(exam => exam.courseid === courseId && exam.batchid === batchId);
         } else {
             // If no filter selected, show all
             this.activeExams = this.allExams;
         }
    } else {
        this.activeExams = [];
    }

    this.upcomingExams = [];
    this.expiredExams = [];
    this.attendedExams = []; 
    
    const now = new Date().getTime();
    this.activeExams.forEach(exam => {
        const endDate = new Date(exam.end_datetime).getTime();
        // Simple logic: if end date is future, it is upcoming/active
        if (endDate > now) {
            this.upcomingExams.push(exam);
        } else { 
            this.expiredExams.push(exam);
        }
    });
    this.isLoadingExams = false;
    this.cdr.detectChanges(); 
  }

  // --- Filter Logic ---
  // Replaces the getters with a method to update array properties directly
  updateFilterOptions(): void {
    // 1. Update Courses
    if (this.studentAssignedBatches.length > 0) {
        const courseIds = new Set(this.studentAssignedBatches.map(b => b.course_id));
        this.studentCoursesForFilter = this.availableCourses.filter(c => courseIds.has(c.course_id));
    } else {
        this.studentCoursesForFilter = [...this.availableCourses];
    }

    // 2. Update Batches
    if (this.selectedCourseId === null) {
        this.studentBatchesForFilter = [];
    } else {
        // First get batches for the selected course
        const batchesInSelectedCourse = this.availableBatches.filter(b => b.course_id === this.selectedCourseId);
        
        // If student has assigned batches, filter further
        if (this.studentAssignedBatches.length > 0) {
            const assignedBatchIds = new Set(this.studentAssignedBatches.map(b => b.batchid));
            this.studentBatchesForFilter = batchesInSelectedCourse.filter(b => assignedBatchIds.has(b.batchid));
        } else {
            this.studentBatchesForFilter = batchesInSelectedCourse;
        }
    }
  }
}