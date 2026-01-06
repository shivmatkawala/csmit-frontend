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
  batchName: string; // Updated to batchName for consistency
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
  
  examMetadata: ExamMetadata = {
    examName: '',
    courseid: null,
    batchId: null,
    subjectId: null,
    start: this.formatDate(new Date()),
    end: this.formatDate(new Date(Date.now() + 60 * 60 * 1000))
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
        
        if (this.courses.length > 0) {
          if (this.examMetadata.courseid === null) {
            this.examMetadata.courseid = this.courses[0].courseid;
          }
          this.onCourseSelect(); 
        } else if (this.courses.length === 0) {
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
    
    if (!courseId) {
      this.batches = [];
      this.subjects = [];
      this.examMetadata.batchId = null;
      this.examMetadata.subjectId = null;
      return;
    }
    
    this.batches = [];
    this.subjects = [];
    this.examMetadata.batchId = null;
    this.examMetadata.subjectId = null;
    
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

      if (this.batches.length > 0) {
        this.examMetadata.batchId = this.batches[0].batchId;
      } else {
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
      
      if (this.subjects && this.subjects.length > 0) {
        this.examMetadata.subjectId = this.subjects[0].subjectid;
      }
      this.isLoading = false; 
    });
  }
  
  onProceed(form: NgForm): void {
    if (form.invalid) {
      this.alertService.warning('Please fill in all exam details (Step 1).');
      return;
    }
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
    this.examMetadata = {
      examName: '',
      courseid: null,
      batchId: null,
      subjectId: null,
      start: this.formatDate(new Date()),
      end: this.formatDate(new Date(Date.now() + 60 * 60 * 1000))
    };
    
    this.batches = [];
    this.subjects = [];
    this.step = 1;
    this.fetchCourses();
  }
}