import { Component, OnInit } from '@angular/core';

// This component uses a dark, modern design inspired by the user's request,
// utilizing vibrant sky blue and emerald green accents, deep shadows, and better card separation.

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css']
})
export class TrainerDashboardComponent implements OnInit {

  trainerName: string = 'Dr. Vivian Lee';
  trainerId: string = 'T704';
  // Updated placeholder color to match the new Sky Blue primary color
  profileImageUrl: string = 'https://placehold.co/80x80/0ea5e9/ffffff?text=VL';

  // State for filtering queries
  queryFilter: 'All' | 'High Priority' | 'Unresolved' = 'Unresolved'; // Default to show Unresolved for urgency

  metrics: any[] = [];
  teachingCourses: any[] = [];
  pendingTasks: any[] = [];
  allRecentStudentQueries: any[] = [];

  ngOnInit(): void {
    // 1. Key Metrics Data - Updated Icons for modern look
    this.metrics = [
      { label: 'Active Students', value: '85', icon: '🧑‍🚀' }, // Active Students
      { label: 'Courses Mentored', value: '3', icon: '🌐' }, // Courses
      { label: 'Pending PR Reviews', value: '7', icon: '⚙️' }, // Pending Work
      { label: 'Avg. Course Rating', value: '4.8/5', icon: '🏆' }, // Rating
    ];

    // 2. Tech Courses Data
    this.teachingCourses = [
      { id: 'FSD501', title: 'Full Stack JavaScript', totalStudents: 40, completion: 75, status: 'Active' },
      { id: 'DVE402', title: 'AWS DevOps Engineering', totalStudents: 22, completion: 92, status: 'Active' },
      { id: 'ADS603', title: 'Advanced Data Structures', totalStudents: 15, completion: 45, status: 'Upcoming' },
      { id: 'PYM410', title: 'Python Machine Learning', totalStudents: 55, completion: 88, status: 'Active' },
    ];

    // 4. Pending Tasks Data
    this.pendingTasks = [
      { name: 'Review Sprint 3 Code', course: 'FSD501', daysDue: 2 },
      { name: 'Grade Final Project Proposal', course: 'ADS603', daysDue: 5 },
      { name: 'Review CI/CD Pipeline Setup', course: 'DVE402', daysDue: 1 },
      { name: 'Check Module 2 Quiz Scores', course: 'PYM410', daysDue: 7 },
    ];

    // 3. Student Queries Data
    this.allRecentStudentQueries = [
      { id: 1, title: 'Issue with Express routing in FSD501', studentName: 'Ravi S.', courseId: 'FSD501', priority: 'High', resolved: false, date: '2025-10-25' },
      { id: 2, title: 'Clarification on CloudFormation template syntax', studentName: 'Jane D.', courseId: 'DVE402', priority: 'Medium', resolved: false, date: '2025-10-25' },
      { id: 3, title: 'Optimal data structure for large datasets', studentName: 'Amit V.', courseId: 'ADS603', priority: 'Low', resolved: true, date: '2025-10-24' },
      { id: 4, title: 'Request for extension on homework 4', studentName: 'Sarah M.', courseId: 'FSD501', priority: 'Medium', resolved: false, date: '2025-10-23' },
      { id: 5, title: 'In-depth explanation of backpropagation', studentName: 'Priya K.', courseId: 'PYM410', priority: 'High', resolved: false, date: '2025-10-23' },
    ];
  }

  // --- Methods for UI Logic (No functional change) ---

  /**
   * Filters the list of queries based on the current filter state.
   */
  get filteredQueries(): any[] {
    switch (this.queryFilter) {
      case 'High Priority':
        return this.allRecentStudentQueries.filter(q => q.priority === 'High' && !q.resolved);
      case 'Unresolved':
        return this.allRecentStudentQueries.filter(q => !q.resolved);
      case 'All':
      default:
        // Sorts unresolved items first for better visibility on the 'All' tab
        return [...this.allRecentStudentQueries].sort((a, b) => (a.resolved === b.resolved) ? 0 : a.resolved ? 1 : -1);
    }
  }

  /**
   * Getter to calculate the count of *all* unresolved queries for the button label.
   */
  get unresolvedQueryCount(): number {
    return this.allRecentStudentQueries.filter(q => !q.resolved).length;
  }
  
  /**
   * Getter to calculate the count of *all* high priority queries for the button label.
   */
  get highPriorityQueryCount(): number {
    // Counts high priority queries that are NOT resolved
    return this.allRecentStudentQueries.filter(q => q.priority === 'High' && !q.resolved).length;
  }

  // Method to mark a query as resolved (for UI demo)
  toggleQueryResolved(query: any): void {
    query.resolved = !query.resolved;
  }

  /**
   * Returns a CSS class based on course completion percentage.
   */
  getCompletionClass(completion: number): string {
    if (completion >= 80) {
      return 'completion-green';
    } else if (completion >= 50) {
      return 'completion-yellow';
    } else {
      return 'completion-red';
    }
  }

  /**
   * Returns a CSS class based on course status.
   */
  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'status-active';
      case 'upcoming':
        return 'status-upcoming';
      default:
        return 'status-default';
    }
  }

  /**
   * Returns a CSS class based on task urgency (days due).
   */
  getTaskPriorityClass(daysDue: number): string {
    if (daysDue <= 3) {
      return 'priority-high';
    } else if (daysDue <= 7) {
      return 'priority-medium';
    } else {
      return 'priority-low';
    }
  }
}
