import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer, Observable, of, throwError } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService, LoginResponse, StudentInfo, StudentProfileDetails, StudentBatchDetails } from '../services/api.service'; 
import { examAPi } from '../services/createexam.service'; 
import { ResumeService } from '../services/create-resume.service'; 
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin } from 'rxjs'; 

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
  
  loadingDashboardData: boolean = true; 

  searchControl = new FormControl('');
  notificationsEnabled: boolean = true; 

  // --- Page Navigation ---
  // FIX: Added 'generate-resume' and 'create-profile' as potential active pages
  activePage: string = 'dashboard'; 
  
  // --- Profile Data for settings component ---
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

  // --- User & Clock Data (For real-time updates) ---
  studentName: string = 'Loading...'; 
  profileImageUrl: string = ''; 
  profileImagePlaceholder: boolean = true; 
  profileInitial: string = ''; 
  
  greeting: string = '';
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = '';
  todayDate: Date = new Date();
  private timeSubscription?: Subscription;

  // --- NEW PROFILE COMPLETION/MODAL PROPERTIES ---
  isProfileComplete: boolean = false; 
  showProfileCompletionModal: boolean = false; 
  
  // --- BATCH MODAL PROPERTIES ---
  showBatchModal: boolean = false; 
  selectedBatchDetails: BatchDetailsModal[] = []; 

  // --- Feature Cards, Courses, Assignments ---
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

  // --- Calendar and Schedule ---
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date(); 
  calendarDays: { date: number | string; disabled: boolean; selected: boolean; fullDate: Date | null }[] = [];
  fullScheduleDetails: ScheduleItem[] = []; 
  scheduleDetails: ScheduleItem[] = []; 
  selectedScheduleDate: Date | null = null;

  // --- Form & Message Properties ---
  showAssignmentModal: boolean = false; 
  assignmentTitleControl = new FormControl('', Validators.required);
  assignmentDetailsControl = new FormControl('');
  message: string = '';
  messageType: 'success' | 'error' | 'warning' | '' = '';
  
  // --- NEW EXAM PROPERTIES ---
  showExamModal: boolean = false; 
  allExams: AvailableExam[] = []; 
  activeExams: AvailableExam[] = []; 
  isLoadingExams: boolean = true;
  selectedExamId: number | null = null;
  examToAttend: AvailableExam | null = null; 
  upcomingExams: AvailableExam[] = []; 
  expiredExams: AvailableExam[] = []; 
  attendedExams: AvailableExam[] = []; 
  
  // --- BATCH/COURSE FILTER PROPERTIES ---
  studentAssignedBatches: StudentBatchDetails[] = []; 
  availableCourses: FilterCourse[] = []; 
  availableBatches: FilterBatch[] = []; 

  // Dropdown Selections
  selectedCourseId: number | null = null; 
  selectedBatchId: number | null = null; 

  constructor(
      private cdr: ChangeDetectorRef, 
      private apiService: ApiService, 
      private examService: examAPi, 
      private resumeService: ResumeService 
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
    
    // Step 1: Load Courses and Batches for filter dropdowns
    this.fetchCoursesAndBatchesForFilter().subscribe({
      next: () => {
        // Step 2: Fetch Student Data (this includes the profile completion check)
        this.fetchStudentDataFromStorage().subscribe(() => {
            // Step 3: Profile completion check after student data loads
            this.checkProfileCompletion();
        });
      },
      error: () => {
        // ERROR: If Course/Batch Filter Data fails to load, proceed with fallback
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
    
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
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


  /**
   * Fetches student login data and processes batch/course details for filtering.
   */
  private fetchStudentDataFromStorage(): Observable<any> {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    const studentId = loginData?.userId;
    
    this.loadingDashboardData = true; 
    this.cdr.detectChanges(); 

    // --- FALLBACK LOGIC HELPER for Filters ---
    const setDefaultFilters = (fallbackId: number, fallbackName: string) => {
        this.selectedCourseId = fallbackId;
        this.selectedBatchId = fallbackId;
        this.studentProfileData = {
            ...this.studentProfileData,
            batchId: fallbackId,
            courseId: fallbackId
        };
        this.updateBatchCard(fallbackName, true);
        console.warn(`No assigned batch/course data. Using fallback (${fallbackName}).`);
        this.showMessage('Batch/Course data missing. Using defaults for filter.', 'warning');
    };
    // ----------------------------
    
    if (studentId) {
      
      // FIX: Check session storage for full name saved during resume submission
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
          profileInitial: initial, // Update initial in profile data
          featureCards: this.quickAccessCards.map(card => ({
              ...card,
              label: card.title, 
              info: card.subText,
          }))
      };
      
      console.log('--- Student Data Found. Fetching All Batch Details for ID:', studentId, '---');
      
      // 2. Fetch ALL Batch/Course details for the student
      return this.apiService.fetchStudentBatches(studentId).pipe(
          tap((batchDetails: StudentBatchDetails[]) => {
              
              if (batchDetails && batchDetails.length > 0) {
                  this.studentAssignedBatches = batchDetails;
                  const firstBatch = batchDetails[0];
                  this.updateBatchCard(firstBatch.batch_name);
                  
                  // Set default filter to the first assigned batch/course
                  this.studentProfileData = {
                      ...this.studentProfileData,
                      batchId: firstBatch.batchid, 
                      courseId: firstBatch.course_id 
                  };
                  this.selectedBatchId = firstBatch.batchid;
                  this.selectedCourseId = firstBatch.course_id;
              } else {
                  // FIX: Use fallback ID 1 for unassigned users
                  setDefaultFilters(1, 'No Assigned Batch');
              }
              
              this.loadingDashboardData = false;
              this.cdr.detectChanges(); 
              this.fetchExamsAndFilter(); 
              
          }),
          catchError((error) => {
              console.error('Error fetching student batches:', error);
              // Use fallback logic if API call fails
              setDefaultFilters(1, 'API Error Fallback');
              this.loadingDashboardData = false;
              this.cdr.detectChanges();
              this.fetchExamsAndFilter(); 
              return of(null); 
          })
      );

    } else {
      // Login Data (userId) is not available (Guest User)
      this.studentName = 'Guest User';
      this.profileInitial = this.getProfileInitial(this.studentName);
      this.profileImagePlaceholder = true;
      // FIX: Use a high ID for guest users that won't clash with real data, but still needs a fallback structure
      setDefaultFilters(9999, 'No User Logged In'); 
      this.loadingDashboardData = false;
      this.showMessage('User ID not found. Showing default Guest content.', 'error');
      
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
      this.cdr.detectChanges(); 
      this.fetchExamsAndFilter(); 
      return of(null); 
    }
  }

  // Logic to calculate profile initial
  getProfileInitial(fullName: string): string {
    if (!fullName) return 'U'; 
    const parts = fullName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
    if (parts.length > 1) {
      // First letter of first name and last name
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


  // =========================================================================
  // PROFILE COMPLETION LOGIC
  // =========================================================================
  
  /**
   * Checks if the student has completed their resume profile (used only for initial prompt).
   */
  private checkProfileCompletion(): void {
      const loginData = this.apiService.getStoredStudentData();
      const userId = loginData?.userId;
      const isCompleteOnce = sessionStorage.getItem('cshub_profile_complete_once') === 'true'; 
      
      if (!userId || isCompleteOnce) {
          this.isProfileComplete = isCompleteOnce; 
          return;
      }
      
      // If the flag is NOT set, perform the API check for the first time.
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
  // NAVIGATION & BUTTON HANDLERS
  // =========================================================================
  
  setActivePage(page: string): void {
    // FIX: Added 'generate-resume' to validPages
    const validPages = ['dashboard', 'courses', 'assignments', 'career', 'profile', 'profile-setting', 'attend-exam', 'generate-resume'];
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
  
  /**
   * FIX: This function now ONLY redirects to the setup form (create-student).
   */
  goToProfileSetupForm(): void {
    this.dismissProfileCompletionModal(); 
    this.showMessage('Redirecting to ATS Profile Setup Form for update/create...', 'success');
    // Navigation always goes to the form
    window.location.href = 'create-student'; 
  }

  /**
   * NEW: Sets the activePage to display the GenerateAtsResumeComponent inside the dashboard.
   */
  goToResumeView(): void {
      this.setActivePage('generate-resume');
      this.showMessage('ATS Resume PDF Viewer opened in dashboard. PDF will attempt to download automatically.', 'success');
  }
  
  // FIX: Old goToProfileSetup function renamed to goToProfileSetupForm and updated
  goToProfileSetup(): void {
      this.goToProfileSetupForm();
  }


  // =========================================================================
  // MODAL/MESSAGE LOGIC (Fixing missing functions and data structure usage)
  // =========================================================================
  
  // FIX: Added missing assignment modal functions to resolve compilation errors
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
      this.showMessage(`Assignment '${this.assignmentTitleControl.value}' submitted successfully!`, 'success');
      this.closeAssignmentModal();
    } else {
      this.showMessage('Please provide an assignment title.', 'warning');
    }
  }

  openBatchModal(): void {
      if (this.loadingDashboardData) {
          this.showMessage('Please wait, dashboard data is still loading...', 'warning');
          return;
      }
      
      if (this.studentAssignedBatches.length === 0) {
          this.showMessage('No batches are currently assigned to you. Contact admin.', 'warning');
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
              description: `This batch focuses on the core curriculum of ${course?.course_name || 'Assigned Course'} and meets specific industry requirements.`
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
        this.showMessage('Please wait, dashboard data is still loading...', 'warning');
        return;
    }
    this.showExamModal = true;
    this.selectedExamId = null; 
    this.fetchExamsAndFilter();
    this.cdr.detectChanges(); 
  }

  closeExamModal(): void {
    this.showExamModal = false;
  }
  
  startExam(): void {
    if (!this.selectedExamId || !this.selectedExam) {
        this.showMessage('Please select an exam to start.', 'warning');
        return;
    }
    const examDetails = this.selectedExam;
    if (!this.upcomingExams.find(e => e.examId === examDetails.examId)) {
         this.showMessage('Cannot start this exam. It might be expired or already submitted.', 'error');
         return;
    }
    this.showMessage(`Starting Exam: ${examDetails.examName}`, 'success');
    this.examToAttend = examDetails;
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

  // --- Clock/Calendar Logic (Omitted for brevity, assumed functional) ---
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
  
  // --- Exam/Filter Logic (Omitted for brevity, assumed functional) ---
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
            this.cdr.detectChanges(); 
        }),
        catchError((error) => {
            console.error('Error fetching courses/batches for filter:', error);
            this.showMessage('Error loading course/batch options for filtering.', 'error');
            return throwError(() => new Error('Course/Batch filter data failed to load.')); 
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
            console.error('Global Exam list fetch failed. API error details:', error);
            this.showMessage('Error fetching global exam list. Check API server.', 'error');
            return of([]); 
        })
    );
  }
  
  fetchExamsAndFilter(): void {
    this.isLoadingExams = true;
    this.selectedExamId = null;
    this.cdr.detectChanges();
    if (this.allExams.length === 0) {
        this.fetchAllActiveExams().subscribe(exams => {
            this.allExams = exams;
            this.applyExamFilter();
        });
    } else {
        this.applyExamFilter();
    }
  }

  applyExamFilter(): void {
    const courseId = this.selectedCourseId;
    const batchId = this.selectedBatchId;
    if (courseId === null || batchId === null) {
        this.activeExams = [];
        this.upcomingExams = [];
        this.expiredExams = [];
        this.attendedExams = [];
        this.isLoadingExams = false;
        this.cdr.detectChanges();
        return;
    }
    this.activeExams = this.allExams.filter(exam => exam.courseid === courseId && exam.batchid === batchId);
    this.upcomingExams = [];
    this.expiredExams = [];
    this.attendedExams = []; 
    const now = new Date().getTime();
    this.activeExams.forEach(exam => {
        const endDate = new Date(exam.end_datetime).getTime();
        if (endDate <= now) {
            this.expiredExams.push(exam);
        } else { 
            this.upcomingExams.push(exam);
        }
    });
    this.isLoadingExams = false;
    this.cdr.detectChanges(); 
  }

  get filteredBatches(): FilterBatch[] {
      if (this.selectedCourseId === null) {
          return [];
      }
      return this.availableBatches.filter(b => b.course_id === this.selectedCourseId);
  }
  
  get studentCoursesForFilter(): FilterCourse[] {
      if (this.studentAssignedBatches.length > 0) {
          const courseIds = new Set(this.studentAssignedBatches.map(b => b.course_id));
          return this.availableCourses.filter(c => courseIds.has(c.course_id));
      }
      return this.availableCourses;
  }
  
  get studentBatchesForFilter(): FilterBatch[] {
      if (this.selectedCourseId === null) {
          return [];
      }
      const batchesInSelectedCourse = this.availableBatches.filter(b => b.course_id === this.selectedCourseId);
      if (this.studentAssignedBatches.length > 0) {
          const assignedBatchIds = new Set(this.studentAssignedBatches.map(b => b.batchid));
          return batchesInSelectedCourse.filter(b => assignedBatchIds.has(b.batchid));
      }
      return batchesInSelectedCourse;
  }

}