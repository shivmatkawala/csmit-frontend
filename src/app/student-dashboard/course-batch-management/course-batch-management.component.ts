import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService, StudentBatchDetails } from 'src/app/services/api.service';
import { CreateCourseService, Subject } from 'src/app/services/create-course.service';

interface ExtendedBatchDetails extends StudentBatchDetails {
  subjects?: Subject[];
  schedule?: any[];
  progress?: number;
  instructor?: string;
  coverImage?: string;
}

@Component({
  selector: 'app-course-batch-management',
  templateUrl: './course-batch-management.component.html',
  styleUrls: ['./course-batch-management.component.css']
})
export class CourseBatchManagementComponent implements OnInit, OnDestroy {
  
  @Input() studentId: string = '';
  @Input() initialBatches: StudentBatchDetails[] = [];
  @Output() backToDashboard = new EventEmitter<void>();

  batches: ExtendedBatchDetails[] = [];
  selectedBatch: ExtendedBatchDetails | null = null;
  loading: boolean = false;
  
  // Real-time subscription
  private refreshSubscription?: Subscription;

  // Mock data for UI enhancement (since backend might not have all these yet)
  private mockImages = [
    'https://img.freepik.com/free-vector/laptop-with-program-code-isometric-icon-software-development-programming-applications-dark-neon_39422-971.jpg',
    'https://img.freepik.com/free-vector/gradient-ui-ux-background_23-2149052117.jpg',
    'https://img.freepik.com/free-vector/app-development-banner_33099-1720.jpg'
  ];

  constructor(
    private apiService: ApiService,
    private courseService: CreateCourseService
  ) {}

  ngOnInit(): void {
    // Initialize with passed data
    this.processBatches(this.initialBatches);

    // Setup Real-time polling (every 10 seconds)
    if (this.studentId) {
      this.refreshSubscription = interval(10000).pipe(
        switchMap(() => this.apiService.fetchStudentBatches(this.studentId))
      ).subscribe({
        next: (data) => {
          // Only update if we aren't currently viewing a detailed page to avoid UI jumping
          if (!this.selectedBatch) {
            this.processBatches(data);
          }
        },
        error: (err) => console.error('Real-time batch fetch error', err)
      });
    }
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  processBatches(data: StudentBatchDetails[]): void {
    this.batches = data.map((batch, index) => ({
      ...batch,
      // Add UI specific mock data if missing from API
      progress: Math.floor(Math.random() * 100),
      instructor: 'Senior Trainer',
      coverImage: this.mockImages[index % this.mockImages.length],
      subjects: [] // Will fetch on demand
    }));
  }

  viewBatchDetails(batch: ExtendedBatchDetails): void {
    this.loading = true;
    this.selectedBatch = batch;

    // Fetch Subjects for this course
    // Assuming course_id is available in StudentBatchDetails. 
    // If not, we might need to fetch course details first.
    // Here we simulate fetching subjects or use the Course Service list
    this.courseService.listCourses().subscribe(courses => {
       const matchedCourse = courses.find(c => c.courseId === batch.course_id); // Ensure ID matching logic is correct
       if (matchedCourse && matchedCourse.subjects) {
         this.selectedBatch!.subjects = matchedCourse.subjects;
       } else {
         // Fallback subjects if API structure differs
         this.selectedBatch!.subjects = [
           { subjectname: 'Introduction & Setup' },
           { subjectname: 'Core Concepts' },
           { subjectname: 'Advanced Project' }
         ];
       }
       this.loading = false;
    });
  }

  goBackToList(): void {
    this.selectedBatch = null;
  }

  goHome(): void {
    this.backToDashboard.emit();
  }
}