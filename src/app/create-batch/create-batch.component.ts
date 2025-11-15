import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BatchDetail, Course, CreateBatchPayload, CreateBatchService } from '../services/create-batch.service';
/**
 * Interface for the Batch Data structure in the component state.
 */
interface Batch {
  batchName: string;
  courseId: number | null; 
}

@Component({
  selector: 'app-create-batch',
  templateUrl: './create-batch.component.html',
  styleUrls: ['./create-batch.component.css']
})
export class CreateBatchComponent implements OnInit {

  // State flags for Form
  isSubmitting: boolean = false;
  formSubmitted: boolean = false; 
  errorMessage: string | null = null;
  successMessage: string | null = null;

  // Data
  courses: Course[] = []; // List of all courses
  // batches: BatchDetail[] = []; // Removed Batch List
  
  // Data model initialized with default values for Batch Creation Form
  batchData: Batch = {
    batchName: '',
    courseId: null, // Initially null as no course is selected
  };

  constructor(private batchService: CreateBatchService) { } 

  ngOnInit(): void {
    // Fetch courses on initialization for the creation form
    this.fetchCourseList();
  }
  
  /**
   * Fetches the list of all available courses.
   */
  fetchCourseList(): void {
    this.errorMessage = null; 
    this.successMessage = null; 

    this.batchService.getCourses().subscribe({
      next: (data: Course[]) => {
        this.courses = data;
        if (this.courses.length === 0) {
          this.errorMessage = 'No courses found. Please create a course first.';
        } 
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching course list:', error);
        this.errorMessage = 'Error loading course list: Could not contact the server.';
      }
    });
  }

  // Removed fetchBatchesByCourse and toggleBatchListPanel as list is moved to BatchManagementComponent
  
  /**
   * Handles the form submission for batch creation.
   */
  onSubmit(form: NgForm): void {
    this.errorMessage = null; 
    this.successMessage = null;
    this.formSubmitted = false; 
    
    if (form.invalid || this.batchData.courseId === null) {
      this.errorMessage = 'Form is invalid. Please ensure Batch Name is valid and a Course is selected.';
      return;
    }

    this.isSubmitting = true;

    const payload: CreateBatchPayload = {
      batchName: this.batchData.batchName,
      courseId: this.batchData.courseId
    };

    this.batchService.createBatch(payload).subscribe({
      next: (response) => {
        console.log('Batch creation successful. Response:', response);
        this.isSubmitting = false;
        this.successMessage = `Batch "${payload.batchName}" (Course ID: ${payload.courseId}) created successfully!`;
        this.formSubmitted = true; 
        
        // Reset form to initial state
        form.resetForm({
          courseId: null,
        });
        this.batchData.batchName = ''; 
        this.batchData.courseId = null; 
      },
      error: (error: HttpErrorResponse) => {
        console.error('Batch creation API error:', error);
        this.isSubmitting = false;
        
        if (error.status === 400 && error.error) {
            const errorDetails = typeof error.error === 'string' 
                                ? error.error 
                                : JSON.stringify(error.error);
            this.errorMessage = `Batch creation failed: ${errorDetails}`;
        } else {
            this.errorMessage = 'Error creating batch. Could not contact the server.';
        }
      }
    });
  }
  
  // Removed toggleBatchStatus as list is moved to BatchManagementComponent
}