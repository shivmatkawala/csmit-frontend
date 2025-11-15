import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CreateCourseService, Course, Subject } from '../services/create-course.service'; 
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css']
})
export class CreateCourseComponent implements OnInit {

  // State flags for form submission
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // CRUD State
  isEditMode: boolean = false; // To switch between Create and Update mode
  currentCourseId: number | undefined; // Stores the ID of the course being edited
  
  // List State (Removed: courses, showCourseListPanel, listErrorMessage)
  
  // Data model for the form
  courseData: { 
    courseName: string, 
    contentUrl: string, 
    subjectsInput: string 
  } = {
    courseName: 'Robbotics eith ROS',
    contentUrl: 'https://example.com/robotis-ros-course-materials',
    subjectsInput: 'Golang, Python, Robotics Operating System'
  };

  constructor(private createCourseService: CreateCourseService) { } 

  ngOnInit(): void {
    // Note: If this component is navigated to with a course ID, you would load that course here.
    // Assuming for simplicity that this component is currently only for creation via direct navigation.
  }
  
  // Removed: getSubjectsDisplay, toggleCourseListPanel, fetchCourseList

  /**
   * Resets the form and state to default 'Create' mode.
   */
  resetFormState(form: NgForm): void {
      form.resetForm({
        courseName: '',
        contentUrl: 'https://',
        subjectsInput: ''
      });
      this.isEditMode = false;
      this.currentCourseId = undefined;
      this.formSubmitted = false;
      this.errorMessage = null;
      this.successMessage = null;
  }
  
  /**
   * Pre-fills the form with the selected course data for editing.
   * This method remains but would typically be called by a parent/router service.
   * @param course The course object to load into the form.
   */
  loadCourseForEdit(course: Course): void {
    if (!course.courseId) {
        console.error('Cannot edit a course without a valid ID.', course);
        this.errorMessage = 'Course ID is not available for update.';
        return;
    }

    this.isEditMode = true;
    this.currentCourseId = course.courseId;
    
    // Fill the form data with the selected course
    this.courseData = {
        courseName: course.courseName,
        contentUrl: course.contentUrl,
        // Convert the subjects array of OBJECTS to a comma-separated STRING of names
        subjectsInput: course.subjects && course.subjects.length > 0
                       ? course.subjects.map((sub: Subject) => sub.subjectname).join(', ') 
                       : '' 
    };

    this.errorMessage = null;
    this.successMessage = `Course ID ${course.courseId} loaded for 'Update'.`;
  }
  
  /**
   * Handles the form submission (either CREATE or UPDATE).
   * @param form The NgForm instance.
   */
  onSubmit(form: NgForm): void {
    this.errorMessage = null; 
    this.successMessage = null;
    if (form.invalid) {
      this.errorMessage = 'Form is invalid. Please fill in all required fields correctly.';
      return;
    }

    this.isSubmitting = true;
    
    // Convert subjectsInput string to a simple array of strings (names)
    const subjectsArray: string[] = this.courseData.subjectsInput
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s.length > 0);

    // Construct the API payload object
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
        // UPDATE operation
        payload.courseId = this.currentCourseId;
        apiCall = this.createCourseService.updateCourse(payload as any);
        action = 'update';
    } else {
        // CREATE operation
        apiCall = this.createCourseService.createCourse(payload);
        action = 'creation';
    }
    
    apiCall.subscribe({
        next: (response) => {
            console.log('API Response:', response);
            this.isSubmitting = false;
            this.successMessage = `Course successfully ${action}d!`;
            this.errorMessage = null;
            this.formSubmitted = true;
            this.resetFormState(form); // Reset form
            // Removed: this.fetchCourseList(); 
        },
        error: (error: HttpErrorResponse) => {
            console.error('API Error:', error);
            this.isSubmitting = false;
            this.errorMessage = `Error during course ${action}: Could not contact the server.`;
            this.successMessage = null;
        }
    });
  }
  
  /**
   * Handles the course deletion process. (Typically managed by the list view now)
   * Keeping it simple, only for internal use if needed.
   * @param courseId The ID of the course to delete.
   */
  confirmDelete(courseId: number | undefined): void {
    if (!courseId) {
      this.errorMessage = 'Course ID is not available for deletion.';
      return;
    }
    
    // Using prompt instead of confirm() as per best practices in iframe environment
    const isConfirmed = prompt(`Are you sure you want to delete Course ID ${courseId}? Type 'DELETE' to confirm.`);
    if (isConfirmed !== 'DELETE') {
      return;
    }

    this.isSubmitting = true;
    this.createCourseService.deleteCourse(courseId).subscribe({
        next: (response) => {
            console.log('Delete API Response:', response);
            this.isSubmitting = false;
            this.successMessage = `Course ID ${courseId} successfully deleted.`;
            // Removed: this.fetchCourseList(); 
            if (this.currentCourseId === courseId) {
              this.resetFormState({} as NgForm); 
            }
        },
        error: (error: HttpErrorResponse) => {
            console.error('Delete API Error:', error);
            this.isSubmitting = false;
            this.errorMessage = `Error deleting Course ID ${courseId}.`;
        }
    });
  }
}