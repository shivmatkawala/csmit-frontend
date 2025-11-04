import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
// NOTE: I am assuming you have a createexam.service.ts file with examAPi 
// which has fetchSubjects and fetchBatches methods.
import { examAPi } from '../services/createexam.service';

// --- Interfaces for API Data ---
interface Course {
  courseid: number; 
  coursename: string; 
}

interface Batch {
  batchId: number;
  name: string;
}

// FIX: Subject interface properties changed to match API response (lowercase 'subjectid', 'subjectname')
interface Subject {
  subjectid: number;
  subjectname: string;
}

// FIX: New interface to handle the nested API response for subjects.
interface SubjectAPIResponse {
  course_id: number;
  course_name: string;
  subjects: Subject[]; // The array we need is nested here
}

// --- Question Interface ---
interface Question {
  questionText: string;
  questionType: string;
  options: string[];
  correctOption?: string;
  points: number;
}

// --- Exam Metadata Interface ---
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
    end: this.formatDate(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour later default
  };

  // Step 2 State
  questionTypes = ['mcq', 'discriptive', 'coding'];
  questions: Question[] = [
    { questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctOption: '', points: 1 }
  ];

  // UI State
  isLoading = false;
  message: { type: 'success' | 'error'; text: string } | null = null;
  
  constructor(private examService: examAPi) {}

  ngOnInit(): void {
    this.fetchCourses();
  }

  // --- Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm) ---
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // --- API Fetching Methods ---
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
             this.showMessage('error', 'No courses found. Please ensure data is available on the API.');
        }
      },
      error: err => {
        this.showMessage('error', 'Failed to load courses. Check API server.');
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
    
    // Reset dependent fields
    this.batches = [];
    this.subjects = [];
    this.examMetadata.batchId = null;
    this.examMetadata.subjectId = null;
    
    // Fetch Batches
    this.isLoading = true;
    this.examService.fetchBatches(courseId).pipe(
      catchError(err => {
        // Clear loading state on error
        this.isLoading = false;
        this.showMessage('error', `Failed to load batches for course ID: ${courseId}.`);
        console.error('Error fetching batches:', err);
        return of([]);
      })
    ).subscribe((res: Batch[]) => {
      this.batches = res;
      if (this.batches.length > 0) {
        this.examMetadata.batchId = this.batches[0].batchId;
      }
      // NOTE: isLoading is managed after the final fetchSubjects call.
    });

    // Fetch Subjects - Subject ID fetch karne ka logic yahan hai
    this.isLoading = true;
    this.examService.fetchSubjects(courseId).pipe(
      catchError(err => {
        // Clear loading state on error
        this.isLoading = false;
        this.showMessage('error', `Failed to load subjects for course ID: ${courseId}.`);
        console.error('Error fetching subjects:', err);
        return of([]);
      })
    ).subscribe((res: SubjectAPIResponse) => { // Use SubjectAPIResponse interface
      this.subjects = res.subjects; // Assign the nested array property 'subjects'
      
      if (this.subjects && this.subjects.length > 0) {
        // FIX: Use 'subjectid' for metadata assignment
        this.examMetadata.subjectId = this.subjects[0].subjectid;
      }
      this.isLoading = false; // Set loading state to false after the final API call
    });
  }
  
  // --- Step 1 Navigation ---
  onProceed(form: NgForm): void {
    this.message = null;
    if (form.invalid) {
      this.showMessage('error', 'Please fill in all exam details (Step 1).');
      return;
    }
    this.step = 2;
  }
  
  onBack(): void {
    this.step = 1;
    this.message = null;
  }

  // --- Question Management ---
  trackByIndex(index: number): number {
    return index;
  }

  addMore(): void {
    this.questions.push({
      questionText: '',
      questionType: 'mcq',
      options: ['', '', '', ''],
      correctOption: '',
      points: 1
    });
  }
  
  // --- Submission (Step 2) ---
  onSubmit(form: NgForm): void {
    this.message = null;
    if (!form.valid) {
      this.showMessage('error', 'Please complete all questions before submitting.');
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

      if (q.questionType === 'mcq') {
        return {
          ...base,
          options: q.options.filter(opt => opt).map(opt => ({ // Filter out empty options
            option_text: opt,
            is_correct: opt === q.correctOption
          }))
        };
      }
      return base;
    });
    
    const { examName, courseid, batchId, subjectId, start, end } = this.examMetadata;
    
    // Final Payload
    const payload = {
      examName,
      courseId: courseid!, 
      batchId: batchId!,
      subjectId: subjectId!, // Subject ID yahan payload me ja raha hai
      start,
      end,
      questions: formattedQuestions
    };

    this.isLoading = true;
    this.examService.createExam(payload).subscribe({
      next: res => {
        this.showMessage('success', 'Exam created successfully! Moving back to Step 1.');
        this.resetFormState(form);
      },
      error: err => {
        this.showMessage('error', 'Failed to create exam. Please check your inputs or server logs.');
        console.error('Error creating exam:', err);
        this.isLoading = false;
      }
    });
  }
  
  // --- UI/Message Methods ---
  showMessage(type: 'success' | 'error', text: string): void {
    this.message = { type, text };
    setTimeout(() => {
      this.message = null;
    }, 5000);
  }
  
  // Resets all state and returns to step 1
  resetFormState(form: NgForm): void {
    this.isLoading = false;
    // NOTE: Do not reset form to ensure Angular is aware of the change
    // form.resetForm(); 
    
    this.questions = [
      { questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctOption: '', points: 1 }
    ];
    // Reset examMetadata with default values
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
    this.fetchCourses(); // Re-fetch data for step 1
  }
}
