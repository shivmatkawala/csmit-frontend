import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {

  studentName: string = 'Akash Verma';
  studentId: string = 'S1058';
  profileImageUrl: string = 'https://placehold.co/100x100/3b82f6/ffffff?text=AV'; // Blue accent

  metrics: any[] = [];
  courses: any[] = [];
  assignments: any[] = [];
  announcements: string[] = [];

  constructor(private router: Router) {}
  ngOnInit(): void {
    // Tech-focused metrics
    this.metrics = [
      { label: 'Avg. Challenge Score', value: '88%', icon: '🥇' },
      { label: 'Live Session Attendance', value: '92%', icon: '🖥️' },
      { label: 'PRs Merged', value: '14', icon: '🚀' },
      { label: 'Upcoming Deadlines', value: '3', icon: '⏰' },
    ];

    // Tech Courses Data
    this.courses = [
      // FSD: Full Stack Development
      { title: 'Full Stack JavaScript', code: 'FSD501', progress: 75, instructor: 'Dr. Lee', category: 'Backend', colorClass: 'border-blue' },
      // DVE: DevOps Engineering
      { title: 'AWS DevOps Engineering', code: 'DVE402', progress: 92, instructor: 'Prof. Jha', category: 'Cloud', colorClass: 'border-green' },
      // AIS: AI & Data Science
      { title: 'AI & Data Science (Advanced)', code: 'AIS605', progress: 40, instructor: 'Dr. Priya', category: 'Data', colorClass: 'border-rose' },
      // CYB: Cyber Security
      { title: 'Cyber Security Essentials', code: 'CYB301', progress: 85, instructor: 'Mr. Khan', category: 'Security', colorClass: 'border-yellow' },
    ];

    this.assignments = [
      { name: 'FSD501 Final Project Submission', dueDate: '25 Oct', status: 'Pending', priority: 'High', priorityClass: 'priority-high' },
      { name: 'DVE402 CI/CD Pipeline Setup Quiz', dueDate: '30 Oct', status: 'Pending', priority: 'Medium', priorityClass: 'priority-medium' },
      { name: 'AIS605 Initial Reading Report', dueDate: '05 Nov', status: 'Complete', priority: 'Low', priorityClass: 'priority-low' },
    ];

    this.announcements = [
      'Trainer Dr. Lee will hold an extra doubt-clearing session on Friday.',
      'The Q4 Placement Drive for Amazon, Google, and Microsoft is starting next week.',
      'New advanced Kubernetes module added to DVE402 curriculum.',
    ];
  }

  // Helper function to get color class based on progress
  getProgressClass(progress: number): string {
    if (progress >= 80) {
      return 'progress-green';
    } else if (progress >= 50) {
      return 'progress-yellow';
    } else {
      return 'progress-red';
    }
  }

  // Helper function to get course color class based on the data
  getCourseColorClass(course: any): string {
    return course.colorClass;
  }

  goToAtsResume() {
    this.router.navigate(['/generate-ats-resume']);
  }

}
