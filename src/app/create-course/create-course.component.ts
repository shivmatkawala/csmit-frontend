import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CreateCourseService, Course, Subject } from '../services/create-course.service'; 
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { Router } from '@angular/router'; 
import { AlertService } from '../services/alert.service'; // Import AlertService

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css']
})
export class CreateCourseComponent implements OnInit {

  // State flags for form submission
  isSubmitting: boolean = false;
  
  // CRUD State
  isEditMode: boolean = false; 
  currentCourseId: number | undefined; 
  
  // Data model
  courseData: { 
    courseName: string, 
    contentUrl: string, 
    subjectsInput: string 
  } = {
    courseName: '',
    contentUrl: '',
    subjectsInput: ''
  };

  constructor(
    private createCourseService: CreateCourseService,
    private router: Router,
    private alertService: AlertService // Inject AlertService
  ) { } 

  ngOnInit(): void {
  }
  
  /**
   * Navigates back to the previous page (e.g., admin panel)
   */
  goBack(): void {
    this.router.navigate(['/admin-panel']); 
  }

  resetFormState(form: NgForm): void {
      form.resetForm({
        courseName: '',
        contentUrl: 'https://',
        subjectsInput: ''
      });
      this.isEditMode = false;
      this.currentCourseId = undefined;
  }
  
  loadCourseForEdit(course: Course): void {
    if (!course.courseId) {
        console.error('Cannot edit a course without a valid ID.', course);
        this.alertService.error('Course ID is not available for update.');
        return;
    }

    this.isEditMode = true;
    this.currentCourseId = course.courseId;
    
    this.courseData = {
        courseName: course.courseName,
        contentUrl: course.contentUrl,
        subjectsInput: course.subjects && course.subjects.length > 0
                       ? course.subjects.map((sub: Subject) => sub.subjectname).join(', ') 
                       : '' 
    };

    this.alertService.info(`Course ID ${course.courseId} loaded for 'Update'.`, 'Edit Mode');
  }
  
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      this.alertService.warning('Form is invalid. Please fill in all required fields correctly.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;
    
    // Split by Comma OR Semicolon, then trim and filter empty strings
    const subjectsArray: string[] = this.courseData.subjectsInput
                            .split(/[,;]+/) 
                            .map(s => s.trim())
                            .filter(s => s.length > 0);

    let payload: { 
        courseId?: number, 
        courseName: string, 
        contentUrl: string, 
        subjects: string[] 
    } = {
        courseName: this.courseData.courseName,
        contentUrl: this.courseData.contentUrl,
        subjects: subjectsArray 
    };
    
    let apiCall: Observable<any>;
    let action: string;

    if (this.isEditMode && this.currentCourseId) {
        payload.courseId = this.currentCourseId;
        apiCall = this.createCourseService.updateCourse(payload as any);
        action = 'updated';
    } else {
        apiCall = this.createCourseService.createCourse(payload);
        action = 'created';
    }
    
    apiCall.subscribe({
        next: (response) => {
            console.log('API Response:', response);
            this.isSubmitting = false;
            this.alertService.success(`Course successfully ${action}!`);
            this.resetFormState(form); 
        },
        error: (error: HttpErrorResponse) => {
            console.error('API Error:', error);
            this.isSubmitting = false;

            // --- IMPROVED ERROR HANDLING ---
            // Backend se aayi hui specific detail message ko pakadna
            let errorMessage = `Error during course ${action.replace('ed', 'ion')}.`;

            if (error.error && error.error.detail) {
                // Agar backend { "detail": "..." } bhej raha hai
                errorMessage = error.error.detail;
            } else if (error.error && typeof error.error === 'string') {
                // Agar backend plain string bhej raha hai
                errorMessage = error.error;
            } else if (error.message) {
                 // Fallback to generic HTTP status text
                 errorMessage = error.message;
            }

            // User ko saaf error dikhana
            this.alertService.error(errorMessage);
        }
    });
  }
  
  confirmDelete(courseId: number | undefined): void {
    if (!courseId) {
      this.alertService.error('Course ID is not available for deletion.');
      return;
    }
    
    const isConfirmed = prompt(`Are you sure you want to delete Course ID ${courseId}? Type 'DELETE' to confirm.`);
    if (isConfirmed !== 'DELETE') {
      return;
    }

    this.isSubmitting = true;
    this.createCourseService.deleteCourse(courseId).subscribe({
        next: (response) => {
            console.log('Delete API Response:', response);
            this.isSubmitting = false;
            this.alertService.success(`Course ID ${courseId} successfully deleted.`);
            if (this.currentCourseId === courseId) {
              this.resetFormState({} as NgForm); 
            }
        },
        error: (error: HttpErrorResponse) => {
            console.error('Delete API Error:', error);
            this.isSubmitting = false;
            
            // Similar robust error handling for delete
            let errorMessage = `Error deleting Course ID ${courseId}.`;
            if (error.error && error.error.detail) {
                errorMessage = error.error.detail;
            }
            this.alertService.error(errorMessage);
        }
    });
  }
}