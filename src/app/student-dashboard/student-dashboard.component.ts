// student-dashboard.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { interval, Subscription, timer } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService, LoginResponse } from '../services/api.service';
// --- Interfaces for Student Data (Dummy Data Structure) ---
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
  email: string; // Dummy email added
  student_id: string; // Dummy student_id added
  profileImageUrl: string;
  profileInitial: string;
  profileImagePlaceholder: boolean; // <-- FIX: Added missing property
  courses: Course[];
  featureCards: FeatureCard[];
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
    student_id: 'STU-0000',
    profileImageUrl: '',
    profileInitial: '',
    profileImagePlaceholder: true, // Default value
    courses: [],
    featureCards: []
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
  // Replicating the HR dashboard's clocking mechanism for tracking study time
  studyTimeTimer: string = '00:00:00'; // Current session timer (HH:MM:SS)
  totalStudyHours: string = '00:00'; // Total hours studied today
  targetRemainingHours: string = '04:00'; // Remaining hours to meet 5-hour target
  isStudying: boolean = false; // True if currently clocked in (studying)
  studyLog: { in: Date, out?: Date, durationSeconds?: number }[] = []; // Local log of study sessions

  // SVG progress bar properties
  private readonly CIRCLE_RADIUS: number = 54;
  private readonly CIRCUMFERENCE: number = 2 * Math.PI * this.CIRCLE_RADIUS;
  readonly MAX_TARGET_HOURS: number = 5; // Target study hours for the day (e.g., 5 hours)
  readonly MAX_TARGET_MINUTES: number = this.MAX_TARGET_HOURS * 60;

  // --- Feature Cards, Courses, Assignments (Dummy Data) ---
  featureCards: FeatureCard[] = []; // Naye feature cards
  courses: Course[] = []; // Courses for progress card
  nextDeadlines: ScheduleItem[] = []; // Next Deadlines and Classes

  // --- Calendar and Schedule ---
  selectedMonthYear: string = '';
  displayedMonthStart: Date = new Date(); // Stores the start date of the currently displayed month
  calendarDays: { date: number | string; disabled: boolean; selected: boolean; fullDate: Date | null }[] = [];
  fullScheduleDetails: ScheduleItem[] = []; // All data for the displayed month
  scheduleDetails: ScheduleItem[] = []; // Filtered list for display
  selectedScheduleDate: Date | null = null;

  // --- Form & Message Properties ---
  showAssignmentModal: boolean = false; // For assignment submission/details
  assignmentTitleControl = new FormControl('', Validators.required);
  assignmentDetailsControl = new FormControl('');
  message: string = '';
  messageType: 'success' | 'error' | 'warning' | '' = '';

  // ApiService ko constructor me inject kiya
  constructor(private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer, private apiService: ApiService) {}

  // =========================================================================
  // LIFECYCLE HOOKS
  // =========================================================================

  ngOnInit(): void {
    // 1. Initialize dummy data first
    this.initializeDummyData();
    
    // 2. Fetch Student Data (Backend storage se)
    this.fetchStudentDataFromStorage();


    // 3. Start real-time clock
    this.updateClock();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.updateClock();
      if (this.isStudying) {
        this.calculateTimeTracking();
      }
    });

    // 4. Initialize Calendar
    const now = new Date();
    this.displayedMonthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the current month
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = this.todayDate;
    this.initializeScheduleData();
    this.updateDisplayedScheduleDetails();
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  // =========================================================================
  // REAL-TIME DATA FETCHING (Backend Storage se)
  // =========================================================================

  private fetchStudentDataFromStorage(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    
    if (loginData && loginData.info) {
      const studentInfo = loginData.info;
      
      this.studentName = studentInfo.full_name || 'Student'; // Full name use kiya
      
      // Filhaal, image nahi aa rahi hai, toh humesha placeholder use karein
      this.profileImageUrl = ''; 
      this.profileImagePlaceholder = true;

      const initial = this.getProfileInitial(this.studentName);

      // StudentProfileData object ko update karein
      this.studentProfileData = {
          full_name: this.studentName,
          email: studentInfo.email || 'johndoe@university.edu', // Dummy/Default email
           student_id: 'STU-0000',
          profileImageUrl: this.profileImageUrl,
          profileInitial: initial,
          profileImagePlaceholder: this.profileImagePlaceholder, // <-- FIX: Assign value
          courses: this.courses, // Dummy data use kar rahe hain
          featureCards: this.featureCards // Dummy data use kar rahe hain
      };

      if (this.profileImagePlaceholder) {
        // Image URL nahi hai, toh initials dikhao
        this.profileInitial = initial;
      }
      
      this.loadingDashboardData = false;
      this.cdr.detectChanges(); // UI ko force update karein
      
      console.log('Student data loaded successfully from API service storage.');

    } else {
      // Data available nahi hai
      this.studentName = 'Guest User';
      this.profileInitial = this.getProfileInitial(this.studentName);
      this.profileImagePlaceholder = true;
      this.loadingDashboardData = false;
      this.showMessage('Login data not found. Showing default content.', 'warning');
      
      // Default data set karein
      this.studentProfileData = {
          full_name: this.studentName,
          email: 'guest@university.edu',
          student_id: 'STU-0000',
          profileImageUrl: '',
          profileInitial: this.profileInitial,
          profileImagePlaceholder: true, // <-- FIX: Assign default value
          courses: this.courses,
          featureCards: this.featureCards
      };
    }
  }

  // Profile initial calculate karne ka logic
  getProfileInitial(fullName: string): string {
    if (!fullName) return 'U'; // Default for unknown
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
  // DATA INITIALIZATION (Dummy)
  // =========================================================================

  private initializeDummyData(): void {
    // 1. Student Feature Cards (Real-time utility for tech students)
    this.featureCards = [
      {
        label: 'Recording Classes', // वीडियो रिकॉर्डिंग
        icon: 'fas fa-video', // वीडियो/क्लास रिकॉर्डिंग आइकन
        value: { watched: 4, total: 10 }, // 10 में से 4 क्लासेज देखीं
        info: '4/10 recordings watched. Keep up the pace!', // फुटर टेक्स्ट
        color: '#4338CA', // Blue
        route: '/recordings' // Recordings पेज पर जाने का रूट
      },
      {
        label: 'Skill Score',
        icon: 'fas fa-bolt', // Skill/Speed icon
        value: { score: 78, level: 'Advanced' },
        info: 'Targeting 90+ in Core Java competency test.',
        color: '#10B981', // Green
        route: '/skills'
      },
      {
        label: 'Daily Coding Streak',
        icon: 'fas fa-fire', // Fire/Streak icon
        value: { streak: 12, target: 30 },
        info: 'You have solved 12 problems in a row!',
        color: '#F43F5E', // Red/Rose
        route: '/dsa'
      },
      {
        label: 'Current Focus',
        icon: 'fas fa-laptop-code', // Coding focus icon
        value: { course: 'React Framework', progress: 65 },
        info: '65% complete. Next lesson: Hooks deep dive.',
        color: '#F59E0B', // Yellow/Orange
        route: '/courses/IT402'
      },
    ];

    // 2. Student Courses (kept for 'Top Courses Progress' section)
    this.courses = [
      { title: 'Advanced Algorithms', progress: 75, instructor: 'Dr. A. Sharma', category: 'CS', code: 'CS501', colorClass: '#3b82f6' },
      { title: 'Data Structures', progress: 92, instructor: 'Prof. J. Singh', category: 'CS', code: 'CS301', colorClass: '#10b981' },
      { title: 'Web Development (React)', progress: 40, instructor: 'Ms. P. Verma', category: 'IT', code: 'IT402', colorClass: '#f43f5e' },
      { title: 'Database Management', progress: 85, instructor: 'Mr. K. Khan', category: 'IT', code: 'IT303', colorClass: '#f59e0b' },
    ];

    // 3. Next Deadlines (similar to HR's Next Holidays)
    const today = new Date();
    this.nextDeadlines = [
      // Ensure date is a string to match the ScheduleItem interface
      { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString().slice(0, 10), desc: 'CS501 Assignment 3 Due', type: 'deadline' },
      { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5).toISOString().slice(0, 10), desc: 'IT402 Project Review', type: 'session' },
      { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10).toISOString().slice(0, 10), desc: 'Final Exam Start Date', type: 'class' },
    ];
  }

  // Initializing comprehensive schedule data for the current month
  private initializeScheduleData(): void {
    this.fullScheduleDetails = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Add dummy classes/sessions/deadlines for the current month
    for (let i = 1; i <= 28; i++) {
        const d = new Date(currentYear, currentMonth, i);
        const dateISO = d.toISOString().slice(0, 10);
        const dayOfWeekShort = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        const dayOfMonth = d.getDate().toString();

        if (i % 7 === 1) { // Monday Class
            this.fullScheduleDetails.push({ date: dateISO, desc: 'CS501 Lecture: 10:00 AM', type: 'class', dayOfWeekShort, dayOfMonth, joinButton: true });
        }
        if (i % 7 === 3) { // Wednesday Deadline
            this.fullScheduleDetails.push({ date: dateISO, desc: 'IT402 Homework Submission', type: 'deadline', dayOfWeekShort, dayOfMonth });
        }
        if (i % 7 === 5) { // Friday Study Session
            this.fullScheduleDetails.push({ date: dateISO, desc: 'Group Study Session: 3:00 PM', type: 'session', dayOfWeekShort, dayOfMonth, joinButton: true });
        }
        if (i === 15) { // Mid-month Test
            this.fullScheduleDetails.push({ date: dateISO, desc: 'CS301 Mid-Term Test', type: 'class', dayOfWeekShort, dayOfMonth });
        }
    }
    // Add dummy study logs for today to simulate real-time tracking
    const todayISO = now.toISOString().slice(0, 10);
    this.studyLog = [
        { in: new Date(todayISO + 'T09:00:00'), durationSeconds: 3600 }, // 1 hour session (completed)
    ];
    this.recalculateTotalStudyHours();

    // If a session has no logout (simulating clock in)
    const lastSession = this.studyLog[this.studyLog.length - 1];
    if (lastSession && lastSession.durationSeconds) { // If last session was completed, start a new one
        this.isStudying = false; // Reset status
    }

    // Sort schedule details
    this.fullScheduleDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }


  // =========================================================================
  // CLOCK AND GREETING LOGIC (Same as HR Dashboard)
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
  // TIME TRACKING LOGIC (Adapted from HR Dashboard)
  // =========================================================================

  // Parses duration string (HH:MM or HH:MM:SS) into total seconds.
  private parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) { // HH:MM
      return parts[0] * 3600 + parts[1] * 60;
    } else if (parts.length === 3) { // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  // Formats total seconds into "HH:MM"
  private formatSecondsToHHMM(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}`;
  }

  // Formats total seconds into "HH:MM:SS"
  private formatSecondsToHHMMSS(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${this.formatTime(hours)}:${this.formatTime(minutes)}:${this.formatTime(seconds)}`;
  }

  // Formats number to two digits
  private formatTime(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  // Recalculates total study hours from the log.
  private recalculateTotalStudyHours(): void {
    let totalSeconds = 0;
    this.studyLog.forEach(session => {
        if (session.durationSeconds) {
            totalSeconds += session.durationSeconds;
        } else if (session.in && !session.out) {
            // Include duration of active session (if any)
            totalSeconds += (new Date().getTime() - session.in.getTime()) / 1000;
        }
    });

    this.totalStudyHours = this.formatSecondsToHHMM(totalSeconds);
    const targetWorkingSeconds = this.MAX_TARGET_HOURS * 3600;
    const pendingSeconds = Math.max(0, targetWorkingSeconds - totalSeconds);
    this.targetRemainingHours = this.formatSecondsToHHMM(pendingSeconds);
  }

  // Calculates and updates the current session timer and remaining target hours.
  private calculateTimeTracking(): void {
    const now = new Date();
    let totalSecondsTrackedToday = 0;
    let currentSessionDurationSeconds = 0;

    // 1. Calculate duration of all COMPLETED sessions
    this.studyLog.forEach(session => {
        if (session.durationSeconds) {
            totalSecondsTrackedToday += session.durationSeconds;
        }
    });

    // 2. Find and calculate ACTIVE session duration (if studying)
    if (this.isStudying && this.studyLog.length > 0) {
      const lastSession = this.studyLog[this.studyLog.length - 1];
      if (lastSession && lastSession.in && !lastSession.out) {
        currentSessionDurationSeconds = (now.getTime() - new Date(lastSession.in).getTime()) / 1000;
        totalSecondsTrackedToday += currentSessionDurationSeconds;

        // Update timeTrackingTimer for the active session (HH:MM:SS)
        this.studyTimeTimer = this.formatSecondsToHHMMSS(currentSessionDurationSeconds);
      }
    } else {
        // If not actively studying, show total study time from log
        this.studyTimeTimer = this.formatSecondsToHHMMSS(this.parseDurationToSeconds(this.totalStudyHours));
    }
  }


  // Handles the "Start Study Session" action (Clock In equivalent)
  startStudySession(): void {
    if (!this.isStudying) {
      this.isStudying = true;
      const newSession: any = { in: new Date() };
      this.studyLog.push(newSession); // Add a new, open session to the log
      this.showMessage('Study Session Started. Focus!', 'success');
      this.cdr.detectChanges();
    } else {
      this.showMessage('You are already in a study session.', 'warning');
    }
  }

  // Handles the "End Study Session" action (Clock Out equivalent)
  endStudySession(): void {
    if (this.isStudying && this.studyLog.length > 0) {
      const lastSession = this.studyLog[this.studyLog.length - 1];
      if (lastSession && lastSession.in && !lastSession.out) {
        lastSession.out = new Date();
        lastSession.durationSeconds = (lastSession.out.getTime() - lastSession.in.getTime()) / 1000;
        this.isStudying = false;
        this.recalculateTotalStudyHours(); // Update total hours after session completion
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
  // CALENDAR POPULATION AND NAVIGATION (Monthly View - Simplified)
  // =========================================================================

  // Populates the calendar array for the given month
  populateCalendar(startDate: Date): void {
    this.calendarDays = [];
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    this.selectedMonthYear = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    // 1. Add placeholder days for the start of the week
    for (let i = 0; i < startDayOfWeek; i++) {
      this.calendarDays.push({ date: '', disabled: true, selected: false, fullDate: null });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Add actual days of the month
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
    // No need to add end placeholders for a simplified monthly view
  }

  // Navigates the calendar view to the previous or next month.
  navigateCalendar(direction: number): void {
    const newMonthStart = new Date(this.displayedMonthStart);
    newMonthStart.setMonth(newMonthStart.getMonth() + direction);
    this.displayedMonthStart = newMonthStart;
    this.populateCalendar(this.displayedMonthStart);
    this.selectedScheduleDate = null; // Reset selection
    this.clearMessage();
    this.updateDisplayedScheduleDetails(); // Re-filter schedule (dummy data uses today's month, so this will only show if month matches)
  }

  // Handles the selection of a date on the calendar.
  onDateSelect(fullDate: Date | null): void {
    if (fullDate) {
      this.selectedScheduleDate = fullDate;
      this.clearMessage();
      this.updateDisplayedScheduleDetails();
    }
  }

  // Filters the full schedule data based on the selected date.
  private updateDisplayedScheduleDetails(): void {
    if (this.selectedScheduleDate) {
      const targetDateISO = this.selectedScheduleDate.toISOString().slice(0, 10);
      this.scheduleDetails = this.fullScheduleDetails.filter(item => item.date === targetDateISO);
    } else {
      // Agar koi date select nahi hai, toh currently displayed month ka sab data dikhao
      this.scheduleDetails = this.fullScheduleDetails.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getFullYear() === this.displayedMonthStart.getFullYear() &&
               itemDate.getMonth() === this.displayedMonthStart.getMonth();
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    // If no schedule details, add a 'No Class' item for the selected date.
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

  // Determines the color class for the course progress bar.
  getProgressColor(progress: number): string {
    if (progress >= 80) return '#10b981'; // Green
    if (progress >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  // =========================================================================
  // NAVIGATION (for Download Resume button and Sidebar)
  // =========================================================================
  
  // New method to change the active page
  setActivePage(page: string): void {
    // Check if the page is valid before setting
    const validPages = ['dashboard', 'courses', 'assignments', 'career', 'profile-setting'];
    if (validPages.includes(page)) {
      this.activePage = page;
      this.clearMessage();
    } else {
      this.showMessage(`Invalid page requested: ${page}`, 'error');
    }
  }

  // New method to handle feature card click/redirection
  openFeature(route: string): void {
    // Note: In a real app, this would use Angular Router.
    this.showMessage(`Navigating to feature: ${route}`, 'success');
    // window.location.href = route;
  }
  
  // New method to handle resume download redirection
  downloadResume(): void {
    // Note: Since Angular Router is not available in the single-file environment, 
    // we'll use a direct window redirection as a placeholder.
    // FIX: अब यह रिज्यूमे फॉर्म (create-student) पेज पर रीडायरेक्ट होगा, जैसा कि अनुरोध किया गया है।
    this.showMessage('Redirecting to Resume Creation Form (ATS Builder)...', 'success');
    // Using window.location.href to simulate redirection to the specified route
    window.location.href = 'create-student'; 
  }


  // =========================================================================
  // MODAL/MESSAGE LOGIC
  // =========================================================================

  // Original open/close modal functions, kept for the quick-submit button
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
