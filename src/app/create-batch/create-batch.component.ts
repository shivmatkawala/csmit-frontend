
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Course, CreateBatchPayload, CreateBatchService } from '../services/create-batch.service';

interface Batch {
  batchName: string;
  courseId: number | null; 
  startDate: string; 
  timing: string;    
  mode: string;      
}

@Component({
  selector: 'app-create-batch',
  templateUrl: './create-batch.component.html',
  styleUrls: ['./create-batch.component.css']
})
export class CreateBatchComponent implements OnInit {

  isSubmitting: boolean = false;
  formSubmitted: boolean = false; 
  errorMessage: string | null = null;
  successMessage: string | null = null;

  courses: Course[] = []; 
  
  // Default Data
  batchData: Batch = {
    batchName: '',
    courseId: null,
    startDate: '',
    timing: '',
    mode: 'Online' 
  };

  modeOptions = ['Online', 'Offline', 'Hybrid'];

  constructor(private batchService: CreateBatchService) { } 

  ngOnInit(): void {
    this.fetchCourseList();
  }
  
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
        this.errorMessage = 'Error loading course list. Server might be down.';
      }
    });
  }

  onSubmit(form: NgForm): void {
    this.errorMessage = null; 
    this.successMessage = null;
    this.formSubmitted = false; 
    
    // Validation
    if (form.invalid || this.batchData.courseId === null) {
      this.errorMessage = 'Form is invalid. Please fill all required fields.';
      return;
    }

    this.isSubmitting = true;

    // ✅ FINAL PAYLOAD CONSTRUCTION
    // Ye keys ab aapke Django Serializer se 100% match karengi.
    const payload: CreateBatchPayload = {
      batchName: this.batchData.batchName,
      courseId: this.batchData.courseId,
      start_date: this.batchData.startDate, // Backend 'start_date' maangta hai
      timing: this.batchData.timing,
      mode: this.batchData.mode
    };

    this.batchService.createBatch(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = `Batch "${payload.batchName}" created successfully!`;
        this.formSubmitted = true; 
        
        // Reset Form
        form.resetForm({
          courseId: null,
          mode: 'Online' 
        });
        
        // Reset Model
        this.batchData = {
            batchName: '',
            courseId: null,
            startDate: '',
            timing: '',
            mode: 'Online'
        };
      },
      error: (error: HttpErrorResponse) => {
        console.error('Batch creation API error:', error);
        this.isSubmitting = false;
        
        if (error.status === 400 && error.error) {
            // Server validation errors dikhane ke liye
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
}
