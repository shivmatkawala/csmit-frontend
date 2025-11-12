// student-dashboard.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer, Observable, of, throwError } from 'rxjs';
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

// FIX: FeatureCard interface को दोनों कंपोनेंट्स (Dashboard और Profile Setting) में इस्तेमाल होने वाली सभी प्रॉपर्टीज़ के साथ मर्ज किया गया है।
interface FeatureCard {
  // Common/Old properties (Profile Setting Component use karta hai)
  label: string; 
  value: string;
  icon: string;
  color: string; // CSS color code

  // New properties (Quick Access Cards use karte hain)
  title: string; // Used in HTML for card header
  subText: string; // Used in HTML for card footer
  colorClass: string; // Used in HTML for [ngClass]
  route: string;
  info?: string; // Optional field for compatibility
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
  featureCards: FeatureCard[]; // FIX: अब यह FeatureCard[] (पुराने style वाला) है
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

// --- NEW INTERFACE for dropdowns (Course and Batch) ---
interface FilterCourse {
    course_id: number;
    course_name: string;
}

interface FilterBatch {
    batchid: number;
    batch_name: string;
    course_id: number; // Batches ko Course se link karne ke liye
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
    featureCards: [], // FIX: Initialize empty for now
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
  // FIX: quickAccessCards डेटा को नए और पुराने दोनों HTML प्रॉपर्टीज़ के लिए अपडेट किया गया है
  quickAccessCards: FeatureCard[] = [
    { 
      label: 'Batches Status', // for Profile Setting compatibility
      title: 'My Batches', // for new HTML cards
      value: 'View Your Batch', 
      icon: 'fas fa-users', 
      color: '#4338CA', 
      info: 'Full Stack 2025 | 45 Students', // for Profile Setting compatibility
      subText: 'Full Stack 2025 | 45 Students', // for new HTML cards
      colorClass: 'stat-blue', // for [ngClass] in new HTML
      route: 'batches' 
    },
    { 
      label: 'Exam Schedule', 
      title: 'Upcoming Exams', 
      value: 'See Your Upcoming Exam', 
      icon: 'fas fa-book-open', 
      color: '#F59E0B', 
      info: 'Next Exam: Data Structures (05 Nov)', 
      subText: 'Next Exam: Data Structures (05 Nov)', 
      colorClass: 'stat-yellow', 
      route: 'exams' 
    },
    { 
      label: 'Assignment Submissions', 
      title: 'Assignments', 
      value: 'Check Your Assignments', 
      icon: 'fas fa-tasks', 
      color: '#10B981', 
      info: '3 Pending Assignments | Due This Week', 
      subText: '3 Pending Assignments | Due This Week', 
      colorClass: 'stat-green', 
      route: 'assignments' 
    },
    { 
      label: 'Fee Status', 
      title: 'Payment Details', 
      value: 'See Your Payment Details', 
      icon: 'fas fa-receipt', 
      color: '#F43F5E', 
      info: 'Next Payment Due: ₹20,000 (30 Dec 2025)', 
      subText: 'Next Payment Due: ₹20,000 (30 Dec 2025)', 
      colorClass: 'stat-red', 
      route: 'payments' 
    },
  ];

  courses: Course[] = [
    { title: 'Advanced Algorithms', progress: 85, category: 'CS', instructor: 'Dr. E. J. Smith', code: 'CS501', colorClass: '#4338CA' },
    { title: 'Database Management', progress: 55, category: 'IT', instructor: 'Ms. K. N. Iyer', code: 'IT402', colorClass: '#10B981' },
    { title: 'Cloud Fundamentals', progress: 92, category: 'IT', instructor: 'Mr. A. P. Khan', code: 'IT303', colorClass: '#F59E0B' },
  ]; 
  nextDeadlines: ScheduleItem[] = [
    { date: '2025-11-05', desc: 'CS501 Assignment 5 Submission', type: 'deadline', dayOfWeekShort: 'TUE', dayOfMonth: '05' },
    { date: '2025-11-08', desc: 'IT402 Week 9 Quiz', type: 'deadline', dayOfWeekShort: 'FRI', dayOfMonth: '08' },
    { date: '2025-11-12', desc: 'IT303 Project Proposal', type: 'deadline', dayOfWeekShort: 'TUE', dayOfMonth: '12' },
  ]; 

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
  allExams: AvailableExam[] = []; // सभी exams store करने के लिए
  activeExams: AvailableExam[] = []; // Filtered exams (by Course/Batch) store करने के लिए
  isLoadingExams: boolean = true;
  selectedExamId: number | null = null;
  examToAttend: AvailableExam | null = null; 

  // --- NEW EXAM CATEGORIZED LISTS ---
  upcomingExams: AvailableExam[] = []; // End date is in the future
  expiredExams: AvailableExam[] = []; // End date is in the past
  attendedExams: AvailableExam[] = []; // Placeholder for future feature (needs API)
  
  // --- BATCH/COURSE FILTER PROPERTIES ---
  studentAssignedBatches: StudentBatchDetails[] = []; // छात्र को असाइन किए गए सभी बैचेज़
  availableCourses: FilterCourse[] = []; // Exam Modal में Course dropdown के लिए
  availableBatches: FilterBatch[] = []; // Exam Modal में Batch dropdown के लिए

  // Dropdown Selections
  selectedCourseId: number | null = null; 
  selectedBatchId: number | null = null; 

  constructor(private cdr: ChangeDetectorRef, private apiService: ApiService, private examService: examAPi) {}

  get selectedExam(): AvailableExam | undefined {
      if (this.selectedExamId === null) {
          return undefined;
      }
      // activeExams se exam dhoondhe (which contains all exams filtered by Course/Batch)
      return this.activeExams.find(e => e.examId === this.selectedExamId); 
  }

  // =========================================================================
  // LIFECYCLE HOOKS
  // =========================================================================

  ngOnInit(): void {
    this.initializeDataStructures();
    
    // Step 1: Courses और Batches को फ़िल्टर ड्रॉपडाउन के लिए लोड करें
    this.fetchCoursesAndBatchesForFilter().subscribe({
      next: () => {
        // Step 2: Course/Batch Filter Data load होने के बाद Student Data fetch करें
        this.fetchStudentDataFromStorage();
      },
      error: () => {
        // ERROR: अगर Course/Batch Filter Data लोड नहीं होता है, तो डिफ़ॉल्ट रूप से आगे बढ़ें
        this.fetchStudentDataFromStorage();
      }
    });

    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateClock();
      if (this.isStudying) {
        this.calculateTimeTracking();
      }
    });

    const now = new Date();
    this.displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    // FIX: Full schedule details ko initialize kiya
    this.fullScheduleDetails = this.createDummySchedule();
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = this.todayDate;
    this.updateDisplayedScheduleDetails();
    
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }
  
  // FIX: Dummy Schedule Data function
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
    // Sort and return the data
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }


  private initializeDataStructures(): void {
    // FIX: featureCards ki jagah quickAccessCards ka use kiya jayega
    // this.featureCards = []; 
    // this.courses = []; 
    // this.nextDeadlines = []; 
    // this.fullScheduleDetails = [];
    // this.studyLog = [];
  }

  private fetchStudentDataFromStorage(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    
    this.loadingDashboardData = true; 
    this.cdr.detectChanges(); 

    // --- FALLBACK LOGIC HELPER ---
    const setDefaultFilters = () => {
        // यदि studentAssignedBatches खाली है
        const firstAvailableCourse = this.availableCourses.length > 0 ? this.availableCourses[0] : null;
        const firstAvailableBatch = this.availableBatches.length > 0 ? this.availableBatches[0] : null;

        if (firstAvailableCourse && firstAvailableBatch) {
            this.selectedCourseId = firstAvailableCourse.course_id;
            this.selectedBatchId = firstAvailableBatch.batchid;
            this.studentProfileData = {
                ...this.studentProfileData,
                batchId: firstAvailableBatch.batchid,
                courseId: firstAvailableCourse.course_id
            };
            console.warn('Student batch data missing. Using first available Course/Batch for default filter.');
            this.showMessage('No assigned batch found. Using first available course/batch for exam filter.', 'warning');
        } else {
             // अंतिम फ़ॉलबैक, यदि कोई Course/Batch लोड ही नहीं हुआ है
            const defaultId = 1;
            this.selectedCourseId = defaultId;
            this.selectedBatchId = defaultId;
            this.studentProfileData = {
                ...this.studentProfileData,
                batchId: defaultId,
                courseId: defaultId
            };
            console.error('No Course/Batch data available. Using hardcoded default IDs (1).');
            this.showMessage('Error: No Course/Batch data available. Using default IDs 1.', 'error');
        }
    };
    // ----------------------------
    
    if (loginData && loginData.userId) {
      const studentId = loginData.userId;
      
      const fullName = loginData.info?.full_name || loginData.username || 'Student'; 
      const email = loginData.info?.email || loginData.username || 'johndoe@university.edu';
      const initial = this.getProfileInitial(fullName);
      
      this.studentName = fullName; 
      this.profileInitial = initial; 
      this.profileImagePlaceholder = true; 
      
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: fullName,
          email: email, 
          student_id: studentId, 
          // FIX: featureCards data set karne ke liye, Profile setting me iska istemal hota hai
          featureCards: this.quickAccessCards.map(card => ({
              ...card,
              // ProfileSettingComponent expects 'label' and 'info' to be present
              // We map 'title' to 'label' and 'subText' to 'info' for backwards compatibility
              label: card.title, 
              info: card.subText,
              // 'value' is already present
          }))
      };
      
      console.log('--- Student Data Found. Fetching All Batch Details for ID:', studentId, '---');
      
      // 2. Fetch ALL Batch/Course details for the student
      this.apiService.fetchStudentBatches(studentId).pipe(
          tap((batchDetails: StudentBatchDetails[]) => {
              
              if (batchDetails && batchDetails.length > 0) {
                  // छात्र के सभी असाइन किए गए बैच store करें
                  this.studentAssignedBatches = batchDetails;
                  
                  // डिफ़ॉल्ट रूप से, पहले बैच/कोर्स को filter selection में सेट करें
                  const firstBatch = batchDetails[0];
                  this.studentProfileData = {
                      ...this.studentProfileData,
                      batchId: firstBatch.batchid, // Default Batch ID
                      courseId: firstBatch.course_id // Default Course ID
                  };
                  this.selectedBatchId = firstBatch.batchid;
                  this.selectedCourseId = firstBatch.course_id;
                  
                  console.log('--- Batches Loaded. Fetching ALL Active Exams. ---');
                  
              } else {
                  // यदि कोई बैच असाइन नहीं है, तो फ़ॉलबैक लॉजिक का उपयोग करें
                  setDefaultFilters();
              }
              
              this.loadingDashboardData = false;
              this.cdr.detectChanges(); 
              this.fetchExamsAndFilter(); // exams fetch करें और फ़िल्टर लागू करें
              
          }),
          catchError((error) => {
              console.error('Error fetching student batches:', error);
              // API कॉल विफल होने पर फ़ॉलबैक लॉजिक का उपयोग करें
              setDefaultFilters();
              this.loadingDashboardData = false;
              this.cdr.detectChanges();
              this.fetchExamsAndFilter(); // exams fetch करें और फ़िल्टर लागू करें
              return of(null); 
          })
      ).subscribe();

    } else {
      // Login Data (userId) उपलब्ध नहीं है
      this.studentName = 'Guest User';
      this.profileInitial = this.getProfileInitial(this.studentName);
      this.profileImagePlaceholder = true;
      
      // Login Data न होने पर भी फ़ॉलबैक लॉजिक का उपयोग करें
      setDefaultFilters();
      
      this.loadingDashboardData = false;
      this.showMessage('Login data (userId) not found. Showing default content.', 'warning');
      
      this.studentProfileData = {
          ...this.studentProfileData,
          full_name: this.studentName,
          email: 'guest@university.edu',
          student_id: 'STU-0000',
          profileInitial: this.profileInitial,
          // batchId और courseId setDefaultFilters() द्वारा सेट किए गए हैं
          // FIX: quickAccessCards data set karna
          featureCards: this.quickAccessCards.map(card => ({
              ...card,
              label: card.title, 
              info: card.subText,
          }))
      };
      this.cdr.detectChanges(); 
      this.fetchExamsAndFilter(); // exams fetch करें और फ़िल्टर लागू करें
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
  // NEW/UPDATED: EXAM LOGIC (Multi-Batch/Course Filtering & Categorization)
  // =========================================================================

  /**
   * Exam Modal के ड्रॉपडाउन को पॉपुलेट करने के लिए सभी courses और batches को fetch करता है।
   */
  fetchCoursesAndBatchesForFilter(): Observable<any> {
    // 1. Courses fetch करें (examService.fetchCourses)
    return this.examService.fetchCourses().pipe(
        // 2. Batches fetch करें (एक-एक Course के लिए)
        switchMap((courses: any[]) => {
            this.availableCourses = courses.map(c => ({
                course_id: c.courseid,
                course_name: c.coursename
            }));

            // सभी courses के लिए batches fetch करने के लिए forkJoin का उपयोग करें
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
            // 3. Batches को availableBatches में स्टोर करें
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

  /**
   * API से सभी active exams fetch करें और उन्हें `allExams` में स्टोर करें।
   */
  fetchAllActiveExams(): Observable<AvailableExam[]> {
    this.isLoadingExams = true;
    this.cdr.detectChanges();
    console.log('Fetching ALL active exams from API for student to filter.');

    // FIX: Changed to fetch all active exams (assuming a listAllExams() exists or can be simulated)
    // NOTE: Django API में exams/exam-list/ endpoint का उपयोग किया जा रहा है
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
                // Removed .filter((exam: AvailableExam) => exam.is_active === true) 
                // because we need all exams (even expired ones) for categorization.
                .filter((exam: AvailableExam) => exam.examId !== null && exam.examId !== undefined); // Ensure exam has an ID
        }),
        catchError((error) => {
            console.error('Global Exam list fetch failed. API error details:', error);
            this.showMessage('Error fetching global exam list. Check API server.', 'error');
            return of([]); 
        })
    );
  }
  
  /**
   * Exams fetch करें (अगर पहली बार) और उन्हें चयनित Course/Batch ID के आधार पर filter करें।
   */
  fetchExamsAndFilter(): void {
    this.isLoadingExams = true;
    this.selectedExamId = null;
    this.cdr.detectChanges();

    // 1. यदि allExams खाली है, तो पहले सभी Exams fetch करें
    if (this.allExams.length === 0) {
        this.fetchAllActiveExams().subscribe(exams => {
            this.allExams = exams;
            this.applyExamFilter();
        });
    } else {
        // 2. यदि allExams पहले से भरे हुए हैं, तो तुरंत filter लागू करें
        this.applyExamFilter();
    }
  }

  /**
   * `allExams` को `selectedCourseId` और `selectedBatchId` के आधार पर filter करता है
   * और उन्हें Upcoming/Expired/Attended श्रेणियों में विभाजित करता है।
   */
  applyExamFilter(): void {
    const courseId = this.selectedCourseId;
    const batchId = this.selectedBatchId;
    
    // Safety check: ensure both IDs are selected before filtering
    if (courseId === null || batchId === null) {
        this.activeExams = [];
        this.upcomingExams = [];
        this.expiredExams = [];
        this.attendedExams = [];
        this.isLoadingExams = false;
        this.cdr.detectChanges();
        // this.showMessage('Please select both Course and Batch to view exams.', 'warning'); // यह मैसेज अब setDefaultFilters() के विफल होने पर ही आएगा
        return;
    }

    // Step 1: Filter by Course and Batch
    this.activeExams = this.allExams.filter(exam => {
        const courseMatch = exam.courseid === courseId;
        const batchMatch = exam.batchid === batchId;
        return courseMatch && batchMatch;
    });

    // Step 2: Categorize by Date (Upcoming/Expired)
    this.upcomingExams = [];
    this.expiredExams = [];
    this.attendedExams = []; // Placeholder for Attended

    const now = new Date().getTime();

    this.activeExams.forEach(exam => {
        const endDate = new Date(exam.end_datetime).getTime();
        
        // Expired Exam: Exam end date is in the past
        if (endDate <= now) {
            this.expiredExams.push(exam);
        } 
        // Upcoming/Ongoing Exam: Exam end date is in the future
        else { 
            this.upcomingExams.push(exam);
        }
        
        // For the 'Attended' list: Requires a specific server check if student submitted the exam.
        // For now, keeping it empty as per current API structure.
    });


    this.isLoadingExams = false;
    
    if (this.activeExams.length === 0) {
        this.showMessage(`No exams found for selected Course (ID: ${courseId}) and Batch (ID: ${batchId}).`, 'warning');
    } else {
        this.showMessage(`${this.activeExams.length} exams found. ${this.upcomingExams.length} upcoming.`, 'success');
    }
    this.cdr.detectChanges(); 
  }
  
  /**
   * Batch dropdown में केवल चयनित Course के batches दिखाने के लिए filter list
   */
  get filteredBatches(): FilterBatch[] {
      if (this.selectedCourseId === null) {
          return [];
      }
      return this.availableBatches.filter(b => b.course_id === this.selectedCourseId);
  }
  
  /**
   * Course dropdown में केवल वही courses दिखाएं जो student को असाइन किए गए हैं
   */
  get studentCoursesForFilter(): FilterCourse[] {
      // यदि studentAssignedBatches उपलब्ध है, तो केवल उन्हीं courses को दिखाएं जो छात्र को असाइन किए गए हैं
      if (this.studentAssignedBatches.length > 0) {
          const courseIds = new Set(this.studentAssignedBatches.map(b => b.course_id));
          return this.availableCourses.filter(c => courseIds.has(c.course_id));
      }
      // यदि studentAssignedBatches उपलब्ध नहीं है, तो सभी उपलब्ध courses दिखाएं
      return this.availableCourses;
  }
  
  /**
   * Course dropdown में केवल वही batches दिखाएं जो student को असाइन किए गए हैं
   * और जो current selected course से भी मेल खाते हों
   */
  get studentBatchesForFilter(): FilterBatch[] {
      if (this.selectedCourseId === null) {
          return [];
      }
      
      const batchesInSelectedCourse = this.availableBatches.filter(b => b.course_id === this.selectedCourseId);

      // यदि studentAssignedBatches उपलब्ध है, तो केवल उन्हीं batches को दिखाएं जो छात्र को असाइन किए गए हैं
      if (this.studentAssignedBatches.length > 0) {
          const assignedBatchIds = new Set(this.studentAssignedBatches.map(b => b.batchid));
          return batchesInSelectedCourse.filter(b => assignedBatchIds.has(b.batchid));
      }
      
      // यदि studentAssignedBatches उपलब्ध नहीं है, तो चुने गए कोर्स के सभी batches दिखाएं
      return batchesInSelectedCourse;
  }


  // Open the Exam Selection Modal
  openExamModal(): void {
    if (this.loadingDashboardData) {
        this.showMessage('Please wait, dashboard data is still loading...', 'warning');
        return;
    }
    
    this.showExamModal = true;
    this.selectedExamId = null; 
    
    // Exam fetch करें और filter लागू करें
    this.fetchExamsAndFilter();
    
    this.cdr.detectChanges(); 
  }

  // Close the Exam Selection Modal
  closeExamModal(): void {
    this.showExamModal = false;
  }
  
  // Start the selected exam
  startExam(): void {
    if (!this.selectedExamId || !this.selectedExam) {
        this.showMessage('Please select an exam to start.', 'warning');
        return;
    }
    
    const examDetails = this.selectedExam;

    // Check if the exam is in the upcoming list before starting
    if (!this.upcomingExams.find(e => e.examId === examDetails.examId)) {
         this.showMessage('Cannot start this exam. It might be expired or already submitted.', 'error');
         return;
    }

    this.showMessage(`Starting Exam: ${examDetails.examName}`, 'success');
    
    // 1. Set the exam object to be passed to the child component
    this.examToAttend = examDetails;

    // 2. Change page to 'attend-exam' and close the modal
    this.closeExamModal();
    this.activePage = 'attend-exam'; 
    
    this.cdr.detectChanges(); 
  }

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
      // Exams को re-fetch करने की आवश्यकता नहीं है, filter अपने आप applied रहेगा
      this.cdr.detectChanges();
  }


  // =========================================================================
  // CLOCK AND GREETING LOGIC 
  // =========================================================================
  // ... (unchanged clock and greeting logic) ...
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
  // ... (unchanged time tracking logic) ...
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
  // ... (unchanged calendar logic) ...
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
      // FIX: New card clicks ke liye navigation logic
      if (page === 'assignments' && this.activePage === 'dashboard') {
          // If clicked from the dashboard card, go to the assignments page
          this.activePage = 'assignments';
      }
      // Future: add logic for 'batches' and 'payments' pages
    } else {
      this.showMessage(`Invalid page requested: ${page}`, 'error');
    }
  }
  
  // FIX: New method for handling quick card clicks
  handleQuickCardClick(route: string): void {
      switch (route) {
          case 'batches':
              this.showMessage('Navigating to Batch Details page...', 'warning');
              // Implement actual page navigation or open a modal here
              break;
          case 'exams':
              this.openExamModal();
              break;
          case 'assignments':
              this.setActivePage('assignments'); // Navigate to the main assignments tab
              break;
          case 'payments':
              this.showMessage('Navigating to Payment Details page...', 'warning');
              // Implement actual page navigation or open a modal here
              break;
          default:
              this.showMessage(`Feature route "${route}" is not yet implemented.`, 'warning');
              break;
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