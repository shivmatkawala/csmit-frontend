// student-dashboard.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer, Observable, of } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
// FIX: LoginResponse, StudentInfo, और StudentBatchDetails के अपडेटेड इंटरफ़ेस को इस्तेमाल करें
import { ApiService, LoginResponse, StudentInfo, StudentProfileDetails, StudentBatchDetails } from '../services/api.service'; 
import { examAPi } from '../services/createexam.service'; // Exam Service ko import kiya
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { forkJoin } from 'rxjs'; // For multiple async calls

interface Course {
  title: string;
  progress: number;
  category: string;
  instructor: string;
  code: string;
  colorClass: string;
}

// Interface for new Feature Cards
interface FeatureCard {
  label: string;
  icon: string;
  value: any; // Can be string, number, or object
  info: string;
  color: string; // Used for icon/text color
  route: string;
}

interface ScheduleItem {
  date: string; // ISO date string: YYYY-MM-DD
  desc: string;
  type: 'class' | 'deadline' | 'session' | 'study';
  dayOfWeekShort?: string;
  dayOfMonth?: string;
  joinButton?: boolean;
}

// ProfileSettingComponent को डेटा पास करने के लिए एक नया Interface
export interface StudentProfileData {
  full_name: string;
  email: string; 
  student_id: string; // FIX: Now stores userId (was csmit_id)
  profileImageUrl: string;
  profileInitial: string;
  profileImagePlaceholder: boolean; // <-- FIX: Added missing property
  courses: Course[];
  featureCards: FeatureCard[];
  // New property to hold student's batch ID for exam filtering
  batchId?: number; 
  courseId?: number; // FIX: Course ID जोड़ा गया
}

// --- NEW INTERFACES for EXAM Feature (API Response Structure) ---
interface Subject {
  subjectid: number;
  subjectname: string;
}

interface Batch {
  batchId: number;
  batchName: string;
}

// FIX: Exam API response structure के अनुरूप Interface
interface AvailableExam {
  examId: number; // For fetching questions
  examName: string;
  start_datetime: string; // NEW
  end_datetime: string;   // NEW
  is_active: boolean;     // NEW
  courseid: number; 
  batchid: number;
  subjectid: number;
  // Note: Assuming 'batch' and 'subject' come as nested objects in the exam-list API response
  batch: { batchId: number, batchName: string }; // Nested Batch object structure ko simplify kiya
  subject: { subjectid: number, subjectname: string }; // Nested Subject object structure ko simplify kiya
  durationMinutes: number; 
  totalQuestions: number; 
}


@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  // Added the missing property
  loadingDashboardData: boolean = true; // Data fetch hone tak true rakha

  searchControl = new FormControl('');
  notificationsEnabled: boolean = true; // Default notifications ON

  // --- Page Navigation ---
  activePage: string = 'dashboard'; // Default page is dashboard
  
  // --- Profile Data for settings component ---
  studentProfileData: StudentProfileData = {
    full_name: 'Loading...',
    email: 'loading@example.com',
    student_id: 'STU-0000', // FIX: Default to dummy ID
    profileImageUrl: '',
    profileInitial: '',
    profileImagePlaceholder: true, // Default value
    courses: [],
    featureCards: [],
    batchId: undefined, // Default value
    courseId: undefined, // Default value
  };

  // --- User & Clock Data (Real-time updates ke liye) ---
  studentName: string = 'Loading...'; // Default value
  profileImageUrl: string = ''; // Backend se image URL (empty string agar image nahi hai)
  profileImagePlaceholder: boolean = true; // Agar image nahi hai to initial dikhana hai
  profileInitial: string = ''; // Name ka pehla akshar
  
  greeting: string = '';
  currentDayOfWeek: string = '';
  currentMonth: string = '';
  currentDay: number = 0;
  currentTime: string = '';
  todayDate: Date = new Date();
  private timeSubscription?: Subscription;

  // --- Study Time Tracking (Clock In/Out) ---
  studyTimeTimer: string = '00:00:00'; 
  totalStudyHours: string = '00:00'; 
  targetRemainingHours: string = '04:00'; 
  isStudying: boolean = false; 
  studyLog: { in: Date, out?: Date, durationSeconds?: number }[] = []; 

  // SVG progress bar properties
  private readonly CIRCLE_RADIUS: number = 54;
  private readonly CIRCUMFERENCE: number = 2 * Math.PI * this.CIRCLE_RADIUS;
  readonly MAX_TARGET_HOURS: number = 5; 
  readonly MAX_TARGET_MINUTES: number = this.MAX_TARGET_HOURS * 60;

  // --- Feature Cards, Courses, Assignments ---
  featureCards: FeatureCard[] = []; 
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
  activeExams: AvailableExam[] = [];
  isLoadingExams: boolean = true;
  selectedExamId: number | null = null;
  
  // FIX 1: Add the missing property required by the template
  examToAttend: AvailableExam | null = null; 

  constructor(private cdr: ChangeDetectorRef, private apiService: ApiService, private examService: examAPi) {}

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
    this.initializeDataStructures();
    this.fetchStudentDataFromStorage(); // यह अब Batch ID और Course ID को फ़ेच करेगा
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateClock();
      if (this.isStudying) {
        this.calculateTimeTracking();
      }
    });

    const now = new Date();
    this.displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = this.todayDate;
    this.updateDisplayedScheduleDetails();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  private initializeDataStructures(): void {
    this.featureCards = []; 
    this.courses = []; 
    this.nextDeadlines = []; 
    this.fullScheduleDetails = [];
    this.studyLog = [];
  }

  private fetchStudentDataFromStorage(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    
    this.loadingDashboardData = true; 
    this.cdr.detectChanges(); 

    // FIX: Check for userId
    if (loginData && loginData.userId) {
      const studentId = loginData.userId;
      
      // FIX: Nullish coalescing operator (?) का उपयोग करके 'info' और 'full_name' को सुरक्षित रूप से एक्सेस करें
      // अगर info या full_name अनुपलब्ध है, तो fallback के रूप में 'username' का उपयोग करें।
      const fullName = loginData.info?.full_name || loginData.username || 'Student'; 
      const email = loginData.info?.email || loginData.username || 'johndoe@university.edu';
      
      const initial = this.getProfileInitial(fullName);
      
      this.studentName = fullName; 
      this.profileInitial = initial; 
      this.profileImagePlaceholder = true; 
      
      // 1. Update basic profile data immediately
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: fullName,
          email: email, 
          student_id: studentId, // student_id now holds the userId
      };
      
      console.log('--- Student Data Found. Fetching Batch Details using ID:', studentId, '---');
      
      // 2. Fetch Batch/Course details using the new fetchStudentBatches API
      this.apiService.fetchStudentBatches(studentId).pipe(
          tap((batchDetails: StudentBatchDetails[]) => {
              
              if (batchDetails && batchDetails.length > 0) {
                  // छात्र कई बैच में हो सकता है; हम पहले बैच का उपयोग कर रहे हैं।
                  const firstBatch = batchDetails[0];
                  const studentBatchId = firstBatch.batchid; 
                  const studentCourseId = firstBatch.course_id; 

                  // 3. Update Batch/Course data
                  this.studentProfileData = {
                      ...this.studentProfileData,
                      batchId: studentBatchId, 
                      courseId: studentCourseId
                  };
                  
                  // 4. Update UI and fetch exams
                  console.log('--- Batches Loaded. Filtering Exams with BATCH ID:', studentBatchId, 'and COURSE ID:', studentCourseId, '---');
                  this.fetchActiveExamsForStudent(studentBatchId, studentCourseId);
                  
              } else {
                  // यदि कोई बैच असाइन नहीं है
                  const defaultId = 1;
                  this.studentProfileData = {
                      ...this.studentProfileData,
                      batchId: defaultId, 
                      courseId: defaultId
                  };
                  console.warn('Student has no assigned batches. Using default IDs 1 for exam filtering.');
                  this.showMessage('No batches assigned. Using default IDs for exams.', 'warning');
                  this.fetchActiveExamsForStudent(defaultId, defaultId); 
              }
              
              this.loadingDashboardData = false;
              this.cdr.detectChanges(); 
              
          }),
          catchError((error) => {
              // API फ़ेल होने पर या ID न मिलने पर डिफ़ॉल्ट ID का उपयोग करें
              console.error('Error fetching student batches (batch/course ID):', error);
              const defaultId = 1; 
              this.studentProfileData = {
                  ...this.studentProfileData,
                  batchId: defaultId,
                  courseId: defaultId
              };
              this.loadingDashboardData = false;
              this.showMessage('Error fetching Batch/Course ID. Using default IDs 1 for exams.', 'error');
              this.cdr.detectChanges();
              this.fetchActiveExamsForStudent(defaultId, defaultId);
              return of(null); // Return observable null to complete the stream
          })
      ).subscribe();

    } else {
      // Login Data (userId) उपलब्ध नहीं है, default/guest data सेट करें
      this.studentName = 'Guest User';
      const defaultId = 1; 
      this.profileInitial = this.getProfileInitial(this.studentName);
      this.profileImagePlaceholder = true;
      this.loadingDashboardData = false;
      this.showMessage('Login data (userId) not found. Showing default content.', 'warning');
      
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: this.studentName,
          email: 'guest@university.edu',
          student_id: 'STU-0000',
          profileInitial: this.profileInitial,
          batchId: defaultId,
          courseId: defaultId
      };
      this.cdr.detectChanges(); 
      this.fetchActiveExamsForStudent(defaultId, defaultId); 
    }
  }

  // Profile initial calculate karne ka logic
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
  
  // =========================================================================
  // NEW/UPDATED: EXAM LOGIC (Batch ID and Course ID filtering)
  // =========================================================================
  
  // Fetch available exams based on the student's batch ID and course ID
  fetchActiveExamsForStudent(batchId: number, courseId: number): void {
      this.isLoadingExams = true;
      this.activeExams = []; 
      this.cdr.detectChanges();
      
      console.log(`Fetching student-specific exams using API for Batch ID: ${batchId} and Course ID: ${courseId}`);

      // FIX: Changed from this.examService.listExams() to the new filtered API
      this.examService.fetchStudentExams(courseId, batchId).pipe(
          map((response: any[]) => {
              // 1. API Response को map करें (फिल्टरिंग अब Django में हो रही है)
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
                      // Batch और Subject data को सुरक्षित रूप से मैप करें, या fallback mock data का उपयोग करें
                      batch: { 
                          batchId: exam.batchid, 
                          batchName: exam.batch?.batchName || `Batch ${exam.batchid}` 
                      },
                      subject: { 
                          subjectid: exam.subjectid, 
                          subjectname: exam.subject?.subjectname || `Subject ID ${exam.subjectid}` 
                      },
                      durationMinutes: exam.durationMinutes || 60, // Default duration if not provided
                      totalQuestions: exam.totalQuestions || 20 // Default questions if not provided
                  }))
                  .filter((exam: AvailableExam) => {
                      // 2. Client-side filter को केवल isActive के लिए रखें (यदि Django इसे पहले से नहीं करता है)
                      // यदि Django व्यू (StudentExamListView) केवल Active exams भेजता है, तो यह filter अनावश्यक है।
                      // सुरक्षा के लिए इसे अभी रखा गया है।
                      return exam.is_active === true;
                  });
          }),
          catchError((error) => {
              console.error(`Student Exam list fetch failed for Batch ID ${batchId} / Course ID ${courseId}. API error details:`, error);
              this.showMessage('Error fetching live exams. Check API server and Django student-exams URL.', 'error');
              
              return of([]); 
          })
      ).subscribe(
          (exams: AvailableExam[]) => {
              this.activeExams = exams;
              this.isLoadingExams = false;
              if (exams.length === 0) {
                  this.showMessage(`No active exams found for your Batch (${batchId}) and Course (${courseId}).`, 'warning');
              } else {
                  this.showMessage(`${exams.length} active exam(s) found for your batch/course.`, 'success');
              }
              this.cdr.detectChanges(); 
          }
      );
  }

  // Open the Exam Selection Modal
  openExamModal(): void {
    if (this.loadingDashboardData) {
        this.showMessage('Please wait, dashboard data is still loading...', 'warning');
        return;
    }
    
    this.showExamModal = true;
    this.selectedExamId = null; 
    
    const currentBatchId = this.studentProfileData.batchId;
    const currentCourseId = this.studentProfileData.courseId;
    
    if (currentBatchId && currentCourseId) {
        // Re-fetch exams using the real-time batch ID and course ID
        this.fetchActiveExamsForStudent(currentBatchId, currentCourseId);
    } else {
        const fallbackId = 1;
        this.showMessage(`Batch/Course ID is missing. Using default IDs ${fallbackId} for filtering.`, 'warning');
        this.fetchActiveExamsForStudent(fallbackId, fallbackId); 
    }
    this.cdr.detectChanges(); 
  }

  // Close the Exam Selection Modal
  closeExamModal(): void {
    this.showExamModal = false;
  }
  
  // Start the selected exam
  // FIX 2: Update startExam to set examToAttend and navigate to the exam page
  startExam(): void {
    if (!this.selectedExamId || !this.selectedExam) {
        this.showMessage('Please select an exam to start.', 'warning');
        return;
    }
    
    const examDetails = this.selectedExam;

    this.showMessage(`Starting Exam: ${examDetails.examName}`, 'success');
    
    // 1. Set the exam object to be passed to the child component
    this.examToAttend = examDetails;

    // 2. Change page to 'attend-exam' and close the modal
    this.closeExamModal();
    this.activePage = 'attend-exam'; 
    
    this.cdr.detectChanges(); 
    
    // NOTE: We don't need to fetch questions here; AttendExamComponent 
    // will handle that in its own ngOnInit, using the inputs we pass it.
  }

  // FIX 3: Add the missing method required by the template
  /**
   * Handles the event when the AttendExamComponent finishes (submitted or expired).
   * It changes the view back to the dashboard and shows a message.
   */
  onExamFinished(event: { status: 'submitted' | 'expired', message: string }): void {
      console.log('Exam Finished Event:', event);
      this.showMessage(event.message, event.status === 'submitted' ? 'success' : 'warning');
      // Reset state and go back to dashboard
      this.examToAttend = null; 
      this.activePage = 'dashboard';
      this.cdr.detectChanges();
  }


  // =========================================================================
  // CLOCK AND GREETING LOGIC 
  // =========================================================================

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
    if (hour >= 5 && hour < 12) this.greeting = 'Good Morning, Future Coder';
    else if (hour >= 12 && hour < 17) this.greeting = 'Good Afternoon, Keep Learning';
    else if (hour >= 17 && hour < 21) this.greeting = 'Good Evening, Finish Strong';
    else this.greeting = 'Good Night, Time to Recharge';
  }

  // =========================================================================
  // TIME TRACKING LOGIC 
  // =========================================================================

  private parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) { 
      return parts[0] * 3600 + parts[1] * 60;
    } else if (parts.length === 3) { 
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  private formatSecondsToHHMM(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}`;
  }

  private formatSecondsToHHMMSS(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
  }

  private formatTime(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  private recalculateTotalStudyHours(): void {
    let totalSeconds = 0;
    this.studyLog.forEach(session => {
        if (session.durationSeconds) {
            totalSeconds += session.durationSeconds;
        } else if (session.in && !session.out) {
            totalSeconds += (new Date().getTime() - session.in.getTime()) / 1000;
        }
    });

    this.totalStudyHours = this.formatSecondsToHHMM(totalSeconds);
    const targetWorkingSeconds = this.MAX_TARGET_HOURS * 3600;
    const pendingSeconds = Math.max(0, targetWorkingSeconds - totalSeconds);
    this.targetRemainingHours = this.formatSecondsToHHMM(pendingSeconds);
  }

  private calculateTimeTracking(): void {
    const now = new Date();
    let totalSecondsTrackedToday = 0;
    let currentSessionDurationSeconds = 0;

    this.studyLog.forEach(session => {
        if (session.durationSeconds) {
            totalSecondsTrackedToday += session.durationSeconds;
        }
    });

    if (this.isStudying && this.studyLog.length > 0) {
      const lastSession = this.studyLog[this.studyLog.length - 1];
      if (lastSession && lastSession.in && !lastSession.out) {
        currentSessionDurationSeconds = (now.getTime() - new Date(lastSession.in).getTime()) / 1000;
        totalSecondsTrackedToday += currentSessionDurationSeconds;

        this.studyTimeTimer = this.formatSecondsToHHMMSS(currentSessionDurationSeconds);
      }
    } else {
        this.studyTimeTimer = this.formatSecondsToHHMMSS(this.parseDurationToSeconds(this.totalStudyHours));
    }
  }

  startStudySession(): void {
    if (!this.isStudying) {
      this.isStudying = true;
      const newSession: any = { in: new Date() };
      this.studyLog.push(newSession); 
      this.showMessage('Study Session Started. Focus!', 'success');
      this.cdr.detectChanges();
    } else {
      this.showMessage('You are already in a study session.', 'warning');
    }
  }

  endStudySession(): void {
    if (this.isStudying && this.studyLog.length > 0) {
      const lastSession = this.studyLog[this.studyLog.length - 1];
      if (lastSession && lastSession.in && !lastSession.out) {
        lastSession.out = new Date();
        lastSession.durationSeconds = (lastSession.out.getTime() - lastSession.in.getTime()) / 1000;
        this.isStudying = false;
        this.recalculateTotalStudyHours(); 
        this.showMessage(`Study Session Ended. Total today: ${this.totalStudyHours}`, 'success');
        this.cdr.detectChanges();
        return;
      }
    }
    this.showMessage('You are not currently in a study session to end.', 'warning');
  }

  // SVG Progress bar for Study Hours
  get studyTimeStrokeDasharray(): string {
    return `${this.CIRCUMFERENCE}`;
  }

  get studyTimeStrokeDashoffset(): string {
    const [hours, minutes] = this.totalStudyHours.split(':').map(Number);
    const currentWorkingMinutes = hours * 60 + minutes;
    const progress = Math.min(1, currentWorkingMinutes / this.MAX_TARGET_MINUTES);
    const offset = this.CIRCUMFERENCE * (1 - progress);
    return `${offset}`;
  }

  // =========================================================================
  // CALENDAR POPULATION AND NAVIGATION 
  // =========================================================================

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

  // =========================================================================
  // NAVIGATION (for Download Resume button and Sidebar)
  // =========================================================================
  
  setActivePage(page: string): void {
    // FIX: 'attend-exam' को validPages में शामिल करें ताकि onExamFinished के बाद वापस आ सके
    const validPages = ['dashboard', 'courses', 'assignments', 'career', 'profile-setting', 'attend-exam'];
    if (validPages.includes(page)) {
      this.activePage = page;
      this.clearMessage();
    } else {
      this.showMessage(`Invalid page requested: ${page}`, 'error');
    }
  }

  openFeature(route: string): void {
    this.showMessage(`Navigating to feature: ${route}`, 'success');
  }
  
  downloadResume(): void {
    this.showMessage('Redirecting to Resume Creation Form (ATS Builder)...', 'success');
    window.location.href = 'create-student'; 
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
      this.showMessage(`Assignment '${this.assignmentTitleControl.value}' submitted successfully!`, 'success');
      this.closeAssignmentModal();
    } else {
      this.showMessage('Please provide an assignment title.', 'warning');
    }
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
}