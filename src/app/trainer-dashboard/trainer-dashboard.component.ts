import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.css']
})
export class TrainerDashboardComponent implements OnInit {

  trainerName: string = 'Dr. Vivian Lee';
  trainerId: string = 'T704';
  profileImageUrl: string = 'https://placehold.co/100x100/10b981/ffffff?text=VL'; // Green accent

  // State for filtering queries
  queryFilter: 'All' | 'High Priority' | 'Unresolved' = 'All';

  metrics: any[] = [];
  teachingCourses: any[] = [];
  pendingTasks: any[] = [];
  allRecentStudentQueries: any[] = [];

  ngOnInit(): void {
    this.metrics = [
      { label: 'Active Students', value: '85', icon: '🧑‍💻' },
      { label: 'Courses Mentored', value: '3', icon: '☁️' },
      { label: 'Pending PR Reviews', value: '7', icon: '🛠️' },
      { label: 'Avg. Course Rating', value: '4.8/5', icon: '⭐' },
    ];

    // Tech Courses Data
    this.teachingCourses = [
      { id: 'FSD501', title: 'Full Stack JavaScript', totalStudents: 40, completion: 75, status: 'Active' },
      { id: 'DVE402', title: 'AWS DevOps Engineering', totalStudents: 25, completion: 90, status: 'Active' },
      { id: 'AIS605', title: 'AI & Data Science (Advanced)', totalStudents: 20, completion: 40, status: 'Upcoming' },
    ];

    this.pendingTasks = [
      { name: 'Grade FSD501 Mid-Module Challenge', course: 'FSD501', daysDue: 2 },
      { name: 'Review DVE402 CI/CD Pipeline PR', course: 'DVE402', daysDue: 5 },
      { name: 'Prepare AIS605 Week 1 Lab', course: 'AIS605', daysDue: 10 },
    ];

    this.allRecentStudentQueries = [
      { name: 'Rohan Verma', course: 'FSD501', subject: 'Error in React Hook lifecycle', time: '12 mins ago', priority: 'High', resolved: false },
      { name: 'Sneha Gupta', course: 'DVE402', subject: 'Doubt about Kubernetes deployment', time: '1 hour ago', priority: 'High', resolved: false },
      { name: 'Amit Singh', course: 'AIS605', subject: 'Suggest a good ML library for NLP', time: '3 hours ago', priority: 'Low', resolved: true },
      { name: 'Priya Khan', course: 'FSD501', subject: 'Issue with MongoDB connection string', time: '1 day ago', priority: 'Medium', resolved: false },
    ];
  }

  /**
   * Getter to filter queries dynamically for the main list.
   * Template uses 'filteredQueries' for its *ngFor.
   */
  get filteredQueries(): any[] {
    switch (this.queryFilter) {
      case 'High Priority':
        // Only show High Priority and Unresolved queries
        return this.allRecentStudentQueries.filter(q => q.priority === 'High' && !q.resolved);
      case 'Unresolved':
        return this.allRecentStudentQueries.filter(q => !q.resolved);
      case 'All':
      default:
        return this.allRecentStudentQueries;
    }
  }

  /**
   * Getter to calculate the count of *all* unresolved queries for the button label.
   */
  get unresolvedQueryCount(): number {
    // This calculation was moved from the HTML interpolation to a getter.
    return this.allRecentStudentQueries.filter(q => !q.resolved).length;
  }
  
  /**
   * Getter to calculate the count of *all* high priority queries for the button label.
   */
  get highPriorityQueryCount(): number {
    // This new getter is required for the button label.
    return this.allRecentStudentQueries.filter(q => q.priority === 'High' && !q.resolved).length;
  }

  // Method to mark a query as resolved (for UI demo)
  toggleQueryResolved(query: any): void {
    query.resolved = !query.resolved;
  }

  getCompletionClass(completion: number): string {
    if (completion >= 80) {
      return 'completion-green';
    } else if (completion >= 50) {
      return 'completion-yellow';
    } else {
      return 'completion-red';
    }
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'active':
        return 'status-active';
      case 'upcoming':
      case 'upcoming': // Duplicate case removed for clean code
        return 'status-upcoming';
      default:
        return 'status-default';
    }
  }

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
