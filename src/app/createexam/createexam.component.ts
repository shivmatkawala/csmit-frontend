import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { examAPi } from '../services/createexam.service';
import { Router } from '@angular/router'; 
import { AlertService } from '../services/alert.service'; // Import AlertService

// Interfaces
interface Course {
  courseid: number; 
  coursename: string; 
}

interface Batch {
  batchId: number;
  batchName: string; 
}

interface Subject {
  subjectid: number;
  subjectname: string;
}

interface SubjectAPIResponse {
  course_id: number;
  course_name: string;
  subjects: Subject[]; 
}

interface Question {
  questionText: string;
  questionType: string;
  options: string[];
  correctOption?: number; 
  points: number;
}

interface ExamMetadata {
  examName: string;
  courseid: number | null; 
  batchId: number | null;
  subjectId: number | null;
  start: string;
  end: string;
}

@Component({
  selector: 'app-createexam',
  templateUrl: './createexam.component.html',
  styleUrls: ['./createexam.component.css']
})
export class CreateExamComponent implements OnInit {
  // Step 1 State
  step: 1 | 2 = 1;
  courses: Course[] = [];
  batches: Batch[] = [];
  subjects: Subject[] = [];
  
  // Property to hold the minimum allowed date (current datetime)
  minDate: string = '';
  
  examMetadata: ExamMetadata = {
    examName: '',
    courseid: null,
    batchId: null,
    subjectId: null,
    start: '',
    end: ''
  };

  // Step 2 State
  questionTypes = ['mcq', 'discriptive', 'coding'];
  questions: Question[] = [
    { questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctOption: 0, points: 1 } 
  ];

  // UI State
  isLoading = false;
  
  constructor(
    private examService: examAPi,
    private router: Router,
    private alertService: AlertService // Inject AlertService
  ) {}

  ngOnInit(): void {
    // Set minDate to current time so past dates are disabled
    this.minDate = this.formatDate(new Date());

    // Initialize start time to now and end time to 1 hour later
    this.examMetadata.start = this.minDate;
    this.examMetadata.end = this.formatDate(new Date(Date.now() + 60 * 60 * 1000));

    this.fetchCourses();
  }

  // Go Back to Admin Panel
  goBack(): void {
    this.router.navigate(['/admin-panel']); 
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  fetchCourses(): void {
    this.isLoading = true;
    this.examService.fetchCourses().subscribe({
      next: (res: Course[]) => {
        this.courses = res;
        this.isLoading = false;
        
        // --- UPDATED: Removed auto-selection of the first course ---
        if (this.courses.length === 0) {
             this.alertService.warning('No courses found. Please ensure data is available on the API.');
        }
      },
      error: err => {
        this.alertService.error('Failed to load courses. Check API server.');
        this.isLoading = false;
        console.error('Error fetching courses:', err);
      }
    });
  }

  onCourseSelect(): void {
    const courseId = this.examMetadata.courseid;
    
    // Reset arrays and selections immediately when course changes
    this.batches = [];
    this.subjects = [];
    this.examMetadata.batchId = null;
    this.examMetadata.subjectId = null;

    if (!courseId) {
      return;
    }
    
    // Fetch Batches
    this.isLoading = true;
    this.examService.fetchBatches(courseId).pipe(
      catchError(err => {
        this.isLoading = false;
        this.alertService.error(`Failed to load batches for course ID: ${courseId}.`);
        console.error('Error fetching batches:', err);
        return of([]);
      })
    ).subscribe((res: any[]) => { // Using any[] to map safely
      // Map response to ensure we have batchName even if API sends 'name'
      this.batches = res.map(b => ({
          batchId: b.batchId,
          batchName: b.batchName || b.name || 'Unknown Batch' // Fallback to 'name'
      }));

      // --- UPDATED: Removed auto-selection of the first batch ---
      if (this.batches.length === 0) {
        this.alertService.info('No batches available for this course.');
      }
    });

    // Fetch Subjects
    this.isLoading = true;
    this.examService.fetchSubjects(courseId).pipe(
      catchError(err => {
        this.isLoading = false;
        this.alertService.error(`Failed to load subjects for course ID: ${courseId}.`);
        console.error('Error fetching subjects:', err);
        return of([]);
      })
    ).subscribe((res: SubjectAPIResponse) => {
      this.subjects = res.subjects; 
      
      // --- UPDATED: Removed auto-selection of the first subject ---
      this.isLoading = false; 
    });
  }
  
  onProceed(form: NgForm): void {
    if (form.invalid) {
      this.alertService.warning('Please fill in all exam details (Step 1).');
      return;
    }

    // --- DATE VALIDATION LOGIC START ---
    const now = new Date();
    const startDate = new Date(this.examMetadata.start);
    const endDate = new Date(this.examMetadata.end);

    // Check if start date is in the past (allowing a small buffer for "now")
    if (startDate.getTime() < now.getTime() - 60000) { // 1 minute buffer
       this.alertService.warning('Start time cannot be in the past. Please choose a correct time.');
       return;
    }

    // Check if end date is before start date
    if (endDate <= startDate) {
      this.alertService.warning('End time must be after the Start time.');
      return;
    }
    // --- DATE VALIDATION LOGIC END ---

    this.step = 2;
  }
  
  onBack(): void {
    this.step = 1;
  }

  trackByIndex(index: number): number {
    return index;
  }

  addMore(): void {
    this.questions.push({
      questionText: '',
      questionType: 'mcq',
      options: ['', '', '', ''],
      correctOption: 0, 
      points: 1
    });
  }
  
  onSubmit(form: NgForm): void {
    if (!form.valid) {
      this.alertService.warning('Please complete all questions before submitting.');
      return;
    }

    const typeMap: Record<string, number> = {
      mcq: 1,
      discriptive: 2,
      coding: 3
    };

    const formattedQuestions = this.questions.map(q => {
      const base = {
        question: q.questionText,
        points: q.points,
        question_typeId: typeMap[q.questionType]
      };

      if (q.questionType === 'mcq' && q.correctOption !== undefined) {
        return {
          ...base,
          options: q.options.filter(opt => opt).map((opt, index) => ({ 
            option_text: opt,
            is_correct: index === q.correctOption 
          }))
        };
      }
      return base;
    });
    
    const { examName, courseid, batchId, subjectId, start, end } = this.examMetadata;
    
    const payload = {
      examName,
      courseId: courseid!, 
      batchId: batchId!,
      subjectId: subjectId!, 
      start,
      end,
      questions: formattedQuestions
    };

    this.isLoading = true;
    this.examService.createExam(payload).subscribe({
      next: res => {
        this.alertService.success('Exam created successfully! Moving back to Step 1.');
        this.resetFormState(form);
      },
      error: err => {
        this.alertService.error('Failed to create exam. Please check your inputs or server logs.');
        console.error('Error creating exam:', err);
        this.isLoading = false;
      }
    });
  }
  
  resetFormState(form: NgForm): void {
    this.isLoading = false;
    
    this.questions = [
      { questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctOption: 0, points: 1 }
    ];
    
    // Reset dates to current time
    this.minDate = this.formatDate(new Date());
    this.examMetadata = {
      examName: '',
      courseid: null,
      batchId: null,
      subjectId: null,
      start: this.minDate,
      end: this.formatDate(new Date(Date.now() + 60 * 60 * 1000))
    };
    
    this.batches = [];
    this.subjects = [];
    this.step = 1;
    this.fetchCourses();
  }
}