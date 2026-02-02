import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { interval, Subscription, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ApiService, StudentBatchDetails } from 'src/app/services/api.service';
import { CreateCourseService, Subject } from 'src/app/services/create-course.service';

/**
 * Generic component for both Student and Trainer dashboards.
 * This component uses 'userId' as a universal input property.
 */
@Component({
  selector: 'app-course-batch-management',
  templateUrl: './course-batch-management.component.html',
  styleUrls: ['./course-batch-management.component.css']
})
export class CourseBatchManagementComponent implements OnInit, OnDestroy {
  
  // 🔑 KEY FIX: Renamed input property to 'userId' for universal compatibility
  @Input() userId: string = ''; 
  @Input() initialBatches: StudentBatchDetails[] = [];
  @Output() backToDashboard = new EventEmitter<void>();

  batches: any[] = [];
  selectedBatch: any | null = null;
  loading: boolean = false;
  
  private refreshSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private courseService: CreateCourseService
  ) {}

  ngOnInit(): void {
    // Priority 1: Initialize with data passed from parent dashboard
    if (this.initialBatches && this.initialBatches.length > 0) {
      this.batches = this.initialBatches;
    } else {
      this.fetchData();
    }

    // Priority 2: Setup real-time sync (polls every 30s)
    if (this.userId) {
      this.refreshSubscription = interval(30000).pipe(
        switchMap(() => this.apiService.fetchStudentBatches(this.userId).pipe(
            catchError(() => of([])) 
        ))
      ).subscribe({
        next: (data) => {
          if (!this.selectedBatch) {
            this.batches = data;
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  fetchData(): void {
    if (!this.userId) return;
    this.loading = true;
    
    // API logic automatically distinguishes between student/trainer context
    this.apiService.fetchStudentBatches(this.userId).subscribe({
      next: (data) => {
        this.batches = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  viewBatchDetails(batch: any): void {
    this.loading = true;
    this.selectedBatch = { ...batch };

    // Map course curriculum details
    this.courseService.listCourses().subscribe({
        next: (courses) => {
            const matchedCourse = courses.find(c => c.courseId === batch.course_id);
            this.selectedBatch.subjects = matchedCourse?.subjects || [];
            this.loading = false;
        },
        error: () => {
            this.selectedBatch.subjects = [];
            this.loading = false;
        }
    });
  }

  goBackToList(): void {
    this.selectedBatch = null;
  }

  goHome(): void {
    this.backToDashboard.emit();
  }
}