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

  // State flags for Batch List Panel
  showBatchListPanel: boolean = false;
  isListLoading: boolean = false;
  listErrorMessage: string | null = null;
  selectedCourseIdForList: number | null = null; // Stores the course ID selected in the side panel

  // Data
  courses: Course[] = []; // List of all courses
  batches: BatchDetail[] = []; // List of batches for the selected course
  
  // Data model initialized with default values for Batch Creation Form
  batchData: Batch = {
    batchName: '',
    courseId: null, // Initially null as no course is selected
  };

  constructor(private batchService: CreateBatchService) { } 

  ngOnInit(): void {
    // Fetch courses on initialization for both forms (creation and list filter)
    this.fetchCourseList();
  }
  
  /**
   * Toggles the visibility of the batch list side panel.
   * Resets the list state when closing.
   */
  toggleBatchListPanel(): void {
    this.showBatchListPanel = !this.showBatchListPanel;
    if (this.showBatchListPanel && this.courses.length > 0) {
      // Automatically select the first course if nothing is selected or the selection is invalid
      if (this.selectedCourseIdForList === null || !this.courses.some(c => c.courseid === this.selectedCourseIdForList)) {
          this.selectedCourseIdForList = this.courses[0].courseid;
      }
      // Fetch batches immediately after opening if a course is selected
      if (this.selectedCourseIdForList !== null) {
        this.fetchBatchesByCourse(this.selectedCourseIdForList);
      }
    } else if (!this.showBatchListPanel) {
      // Reset list state when closing
      this.batches = [];
      this.listErrorMessage = null;
    }
  }

  /**
   * Handles the course selection in the side panel and triggers batch fetch.
   * @param event The change event from the select element.
   */
  onCourseFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    // Ensure the value is converted to a number correctly
    const courseId = parseInt(selectElement.value, 10);
    this.selectedCourseIdForList = courseId;
    this.fetchBatchesByCourse(courseId);
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

  /**
   * Fetches the list of batches for the currently selected course.
   */
  fetchBatchesByCourse(courseId: number | null): void {
    if (courseId === null) {
      this.batches = [];
      this.listErrorMessage = 'Please select a course to view batches.';
      return;
    }
    
    this.isListLoading = true;
    this.listErrorMessage = null;
    this.batches = [];

    this.batchService.getBatchesByCourse(courseId).subscribe({
      next: (data: BatchDetail[]) => {
        this.batches = data;
        this.isListLoading = false;
        if (this.batches.length === 0) {
          this.listErrorMessage = 'No batches found for this course.';
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching batches:', error);
        this.isListLoading = false;
        this.listErrorMessage = 'Error loading batches: Could not contact the server.';
      }
    });
  }
  
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
        
        // If the batch list is open and filtered by this course, refresh the list
        if (this.showBatchListPanel && this.selectedCourseIdForList === payload.courseId) {
            this.fetchBatchesByCourse(payload.courseId);
        }

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
  
  /**
   * Handles the activation/deactivation action for a batch.
   * @param batch The BatchDetail object.
   */
  toggleBatchStatus(batch: BatchDetail): void {
    const action = batch.is_active ? 'Deactivate' : 'Activate';
    // Use batch.batchId here
    const apiCall = batch.is_active 
                  ? this.batchService.deactivateBatch(batch.batchId) 
                  : this.batchService.reactivateBatch(batch.batchId);

    console.log(`${action} request for Batch ID ${batch.batchId} initiated.`);

    apiCall.subscribe({
      next: (response) => {
        console.log(`${action} successful:`, response);
        this.successMessage = `Batch ID ${batch.batchId} (${batch.batchName}) successfully ${action.toLowerCase()}d.`;
        this.errorMessage = null;
        
        // Re-fetch the list to show the updated status
        if (this.selectedCourseIdForList !== null) {
            this.fetchBatchesByCourse(this.selectedCourseIdForList);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error(`${action} failed:`, error);
        this.errorMessage = `Error ${action.toLowerCase()}ing Batch ID ${batch.batchId}.`;
        this.successMessage = null;
      }
    });
  }
}
