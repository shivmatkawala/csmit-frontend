import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Course, CreateBatchPayload, CreateBatchService } from '../services/create-batch.service';
import { Router } from '@angular/router'; // Import Router
import { AlertService } from '../services/alert.service'; // Import AlertService

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

  constructor(
    private batchService: CreateBatchService,
    private router: Router,
    private alertService: AlertService
  ) { } 

  ngOnInit(): void {
    this.fetchCourseList();
  }
  
  // Go Back Method
  goBack(): void {
    this.router.navigate(['/admin-panel']); 
  }

  fetchCourseList(): void {
    this.batchService.getCourses().subscribe({
      next: (data: Course[]) => {
        this.courses = data;
        if (this.courses.length === 0) {
          this.alertService.warning('No courses found. Please create a course first.', 'Warning');
        } 
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching course list:', error);
        this.alertService.error('Error loading course list. Server might be down.', 'System Error');
      }
    });
  }

  onSubmit(form: NgForm): void {
    // Validation Check
    if (form.invalid || this.batchData.courseId === null) {
      form.control.markAllAsTouched();
      this.alertService.warning('Please fill all required fields correctly.', 'Validation Error');
      return;
    }

    this.isSubmitting = true;

    // Construct Payload
    const payload: CreateBatchPayload = {
      batchName: this.batchData.batchName,
      courseId: this.batchData.courseId,
      start_date: this.batchData.startDate, 
      timing: this.batchData.timing,
      mode: this.batchData.mode
    };

    this.batchService.createBatch(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.alertService.success(`Batch "${payload.batchName}" created successfully!`, 'Success');
        
        // Reset Form
        form.resetForm({
          courseId: null,
          mode: 'Online' 
        });
        
        // Reset Model to default state
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
        
        let errorMsg = 'Error creating batch. Could not contact the server.';
        
        if (error.status === 400 && error.error) {
            const errorDetails = typeof error.error === 'string' 
                                ? error.error 
                                : (error.error.detail || JSON.stringify(error.error));
            errorMsg = `Creation failed: ${errorDetails}`;
        }
        
        this.alertService.error(errorMsg, 'Creation Failed');
      }
    });
  }
}