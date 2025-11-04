import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';

// --- Interfaces for Data Models ---
interface ScheduleItem {
  date: string; // ISO date string: YYYY-MM-DD
  desc: string;
  type: 'class' | 'meeting' | 'admin' | 'study'; // Trainer specific types
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

interface StatCardData {
    title: string;
    iconPath: string; // SVG path or name for a custom icon
    value: string;
    subText: string;
    colorClass: string;
}

interface TrainerDetails {
    name: string;
    role: string;
    profileUrl: string; // Placeholder URL for profile image
}

// --- NEW INTERFACE FOR CONFIGURATION DATA ---
interface NavLink {
  id: 'dashboard' | 'attendance' | 'performance' | 'assignments';
  label: string;
  icon: string; // Font Awesome class
}

interface ActionButton {
  label: string;
  icon: string; // Font Awesome class
}

interface StudentPerformance {
  name: string;
  initials: string;
  status: 'Top Performer' | 'Struggling' | 'Intermediate';
  imageUrl: string; // Placeholder URL for student image
  backgroundColor: string; // For placeholder image
  color: string; // For placeholder image text
}

// --- HARDCODED CONFIGURATION DATA (Can be updated later) ---
const CONFIG = {
  SEARCH_PLACEHOLDER: "Search Batches, Students, Tasks...",
  ANNOUNCEMENT_BUTTON: {
    label: "Create Announcement",
    icon: "fas fa-bullhorn"
  },
  SIDEBAR_LINKS: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line' },
    { id: 'attendance', label: 'Attendance', icon: 'fas fa-user-check' },
    { id: 'performance', label: 'Performance', icon: 'fas fa-graduation-cap' },
    { id: 'assignments', label: 'Assignments', icon: 'fas fa-tasks' }
  ] as NavLink[],
  QUICK_ACTIONS: [
    { label: 'Take Attendance', icon: 'fas fa-user-check' },
    { label: 'Upload Class Video', icon: 'fas fa-upload' },
    { label: 'Create Assignment', icon: 'fas fa-edit' },
    { label: 'Announce', icon: 'fas fa-bullhorn' },
    { label: 'View Performance', icon: 'fas fa-chart-bar' },
    { label: 'Update Schedule', icon: 'fas fa-calendar-alt' },
    { label: 'Review Labs', icon: 'fas fa-clipboard-list' },
    { label: 'Student Chat', icon: 'fas fa-comments' },
  ] as ActionButton[],
  TOP_STUDENTS: [
    { name: 'Alice S.', initials: 'AS', status: 'Top Performer', imageUrl: 'https://placehold.co/36x36/10B981/ffffff?text=AS', backgroundColor: '#10B981', color: 'white' },
    { name: 'John K.', initials: 'JK', status: 'Struggling', imageUrl: 'https://placehold.co/36x36/F43F5E/ffffff?text=JK', backgroundColor: '#F43F5E', color: 'white' },
    { name: 'Mary K.', initials: 'MK', status: 'Intermediate', imageUrl: 'https://placehold.co/36x36/4338CA/ffffff?text=MK', backgroundColor: '#4338CA', color: 'white' },
    { name: 'Sam L.', initials: 'SL', status: 'Intermediate', imageUrl: 'https://placehold.co/36x36/4338CA/ffffff?text=SL', backgroundColor: '#4338CA', color: 'white' },
    { name: 'Riya T.', initials: 'RT', status: 'Top Performer', imageUrl: 'https://placehold.co/36x36/10B981/ffffff?text=RT', backgroundColor: '#10B981', color: 'white' },
  ] as StudentPerformance[]
};

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerDashboardComponent {
  // Expose CONFIG to the template
  config = CONFIG;

  // State for Dark Mode using Angular Signal
  darkModeActive = signal(false);

  // State for Student & Class Management Tabs 
  activeTab = signal<'dashboard' | 'attendance' | 'performance' | 'assignments'>('dashboard');

  // --- Trainer Data (Dummy) ---
  trainerDetails: TrainerDetails = {
    name: 'Dr. Anya Sharma',
    role: 'Lead Full-Stack Trainer',
    profileUrl: 'https://placehold.co/80x80/4338CA/ffffff?text=AS' 
  };
  trainerName = this.trainerDetails.name; 
  currentTime = signal('');

  // --- Dashboard Data (Mocked for all 8 modules) ---
  
  // 1) My Batches
  myBatches: BatchInfo[] = [
    { name: 'Full-Stack 2025', strength: 45, timing: '10:00 AM - 1:00 PM', countdown: '2h 15m' }, 
  ];

  // 2-5) Compact Stats Cards (Now 4 cards)
  compactStats: StatCardData[] = [
    { title: 'Attendance Today', iconPath: 'M5 13l4 4L19 7', value: '95%', subText: '5 students marked absent', colorClass: 'stat-blue' },
    { title: 'Pending Review', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-3', value: '23', subText: 'Assignments due', colorClass: 'stat-yellow' },
    // Active Batch Info 
    { title: 'Active Batch', iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', value: this.myBatches[0].name, subText: this.myBatches[0].strength + ' Students | ' + this.myBatches[0].timing, colorClass: 'stat-purple' },
    // Test Performance Metric
    { title: 'Test Performance', iconPath: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.407L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', value: '82%', subText: 'Avg. Batch Score', colorClass: 'stat-green' },
  ];

  // 6) Trainer Tasks / To-Do (Simple list for display)
  toDoTasks = [
    { id: 1, text: 'Review Pending Lab 3 Submissions', priority: 'High', countdown: 'Due Today' },
    { id: 2, text: 'Prepare slides for Advanced Algorithms class', priority: 'Medium', countdown: '2 Days Left' },
    { id: 3, text: 'Schedule 1-on-1 with Struggling Students', priority: 'High', countdown: '1 Day Left' },
  ];

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

  // Computed signal for calendar header
  selectedMonthYear = computed(() =>
    this.displayedMonthStart().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  );

  constructor() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    this.initializeScheduleData();
    this.populateCalendar(this.displayedMonthStart());
    this.updateDisplayedScheduleDetails();
  }

  // =========================================================================
  // CLOCK LOGIC
  // =========================================================================
  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));
  }

  // =========================================================================
  // SCHEDULE DATA AND INITIALIZATION (Dummy)
  // =========================================================================

  private initializeScheduleData(): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const dummyData: ScheduleItem[] = [];

    // Add dummy classes/sessions/meetings for the current month
    for (let i = 1; i <= 28; i++) {
        const d = new Date(currentYear, currentMonth, i);
        const dateISO = d.toISOString().slice(0, 10);
        const dayOfWeekShort = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        const dayOfMonth = d.getDate().toString();

        if (i % 7 === 1) { // Monday Class
            dummyData.push({ date: dateISO, desc: 'CS501 Lecture: 10:00 AM - Online', type: 'class', dayOfWeekShort, dayOfMonth, joinButton: true });
        }
        if (i % 7 === 3) { // Wednesday Meeting
            dummyData.push({ date: dateISO, desc: 'Student Performance Review Meeting', type: 'meeting', dayOfWeekShort, dayOfMonth, joinButton: true });
        }
        if (i % 7 === 5) { // Friday Admin
            dummyData.push({ date: dateISO, desc: 'Curriculum Update Submission Deadline', type: 'admin', dayOfWeekShort, dayOfMonth });
        }
        if (i === 15) { // Mid-month Study/Prep
            dummyData.push({ date: dateISO, desc: 'Personal Research & Prep Time', type: 'study', dayOfWeekShort, dayOfMonth });
        }
    }
    // Sort schedule details
    dummyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.fullScheduleDetails.set(dummyData);
  }

  // =========================================================================
  // CALENDAR LOGIC 
  // =========================================================================

  // Populates the calendar array for the given month.
  populateCalendar(startDate: Date): void {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = lastDayOfMonth.getDate();

    const newCalendarDays: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Add placeholder days for the start of the week
    for (let i = 0; i < startDayOfWeek; i++) {
      newCalendarDays.push({ date: '', disabled: true, selected: false, fullDate: null, hasEvent: false });
    }

    // 2. Add actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDay = new Date(year, month, i);
      const dateISO = currentDay.toISOString().slice(0, 10);
      
      const hasEvent = this.fullScheduleDetails().some(item => item.date === dateISO);

      // Check if this day is the currently selected date
      const isSelected = this.selectedScheduleDate() 
        ? currentDay.toDateString() === this.selectedScheduleDate()!.toDateString() 
        : false;

      newCalendarDays.push({
        date: i,
        disabled: false,
        selected: isSelected, // Check against selectedScheduleDate
        fullDate: currentDay,
        hasEvent: hasEvent
      });
    }
    this.calendarDays.set(newCalendarDays);
  }

  // Navigates the calendar view to the previous or next month.
  navigateCalendar(direction: number): void {
    const currentStart = this.displayedMonthStart();
    const newMonthStart = new Date(currentStart);
    newMonthStart.setMonth(newMonthStart.getMonth() + direction);
    this.displayedMonthStart.set(newMonthStart);
    
    this.selectedScheduleDate.set(null); // Reset selection on month change
    this.populateCalendar(newMonthStart);
    this.updateDisplayedScheduleDetails();
  }

  // Handles the selection of a date on the calendar.
  onDateSelect(day: CalendarDay): void {
    if (day.fullDate) {
      // If the same date is clicked, deselect it
      if (this.selectedScheduleDate()?.toDateString() === day.fullDate.toDateString()) {
          this.selectedScheduleDate.set(null);
      } else {
          this.selectedScheduleDate.set(day.fullDate);
      }
      
      // Update calendar days array to reflect new selection state
      this.populateCalendar(this.displayedMonthStart());
      this.updateDisplayedScheduleDetails();
    }
  }

  // Filters the full schedule data based on the selected date.
  updateDisplayedScheduleDetails(): void {
    const selectedDate = this.selectedScheduleDate();
    let filteredDetails: ScheduleItem[] = [];

    if (selectedDate) {
      const targetDateISO = selectedDate.toISOString().slice(0, 10);
      filteredDetails = this.fullScheduleDetails().filter(item => item.date === targetDateISO);
    } 
    
    // If no schedule details, add a 'No Event' item for the selected date.
    if (selectedDate && filteredDetails.length === 0) {
        const dateISO = selectedDate.toISOString().slice(0, 10);
        const d = new Date(dateISO);
        const dayOfWeekShort = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        const dayOfMonth = d.getDate().toString();
        
        filteredDetails.push({
            date: dateISO,
            desc: 'No Classes or Meetings Scheduled Today!',
            type: 'study',
            dayOfWeekShort,
            dayOfMonth
        });
    }

    this.scheduleDetails.set(filteredDetails);
  }

  // Helper to determine CSS class for schedule item type
  getScheduleTypeClass(type: ScheduleItem['type']): string {
    switch (type) {
      case 'class': return 'class-item';
      case 'meeting': return 'meeting-item';
      case 'admin': return 'admin-item';
      case 'study': return 'study-item';
      default: return 'default-item';
    }
  }

  // Helper function to get status-specific badge style
  getBadgeClass(status: string): string {
    switch (status) {
        case 'Top Performer': return 'badge-top';
        case 'Struggling': return 'badge-struggle';
        case 'Intermediate': return 'badge-intermediate';
        default: return '';
    }
  }

  // =========================================================================
  // LEAVE FORM METHODS 
  // =========================================================================

  openLeaveForm(): void {
    const selectedDate = this.selectedScheduleDate();
    if (selectedDate) {
      this.isLeaveFormOpen.set(true);
      // Pre-fill start date with the selected calendar date
      this.leaveStartDate.set(selectedDate.toISOString().substring(0, 10));
    }
  }

  closeLeaveForm(): void {
    this.isLeaveFormOpen.set(false);
    // Reset form fields
    this.leaveStartDate.set('');
    this.leaveEndDate.set('');
    this.leaveReason.set('');
  }

  submitLeave(): void {
    // Simple validation
    if (!this.leaveStartDate() || !this.leaveEndDate() || !this.leaveReason()) {
      console.error("Please fill all required fields.");
      return;
    }

    // Close the form after submission (simulate success)
    this.closeLeaveForm();
    this.selectedScheduleDate.set(null); // Deselect date after application
    console.log(`Leave application for ${this.leaveStartDate()} to ${this.leaveEndDate()} submitted successfully!`);
  }
}
