import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CareerService } from '../services/careers.service'; // Service Import

@Component({
  selector: 'app-job-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './job-application.component.html',
  styleUrls: ['./job-application.component.css']
})
export class JobApplicationComponent {
  @Input() job: any;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private careerService = inject(CareerService); // Inject Service

  applyForm: FormGroup;
  
  currentStep = 1;
  totalSteps = 3;
  
  selectedFile: File | null = null; // Store actual File object
  selectedFileName = '';
  fileError = false;
  isSubmitting = false;
  isSuccess = false;
  errorMessage = ''; // To show API errors

  // Experience Toggle State
  isExperienced = false;

  constructor() {
    this.applyForm = this.fb.group({
      // STEP 1: Personal Details
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9+\\-\\s]*$')]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      location: ['', Validators.required],

      // STEP 2: Education & Work
      degree: ['', Validators.required],
      university: ['', Validators.required],
      gradYear: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      cgpa: ['', Validators.required],
      
      workStatus: ['Fresher', Validators.required],
      // Conditional Fields
      currentCompany: [''],
      jobTitle: [''],
      experienceYears: [''],
      noticePeriod: [''],
      currentCTC: [''],
      expectedCTC: [''],

      // STEP 3: Links
      linkedin: [''],
      portfolio: [''],
    });

    this.applyForm.get('workStatus')?.valueChanges.subscribe(value => {
      this.updateExperienceValidators(value === 'Experienced');
    });
  }

  updateExperienceValidators(isExp: boolean) {
    this.isExperienced = isExp;
    const fields = ['currentCompany', 'jobTitle', 'experienceYears', 'noticePeriod', 'currentCTC', 'expectedCTC'];
    
    fields.forEach(field => {
      const control = this.applyForm.get(field);
      if (isExp) {
        control?.setValidators([Validators.required]);
      } else {
        control?.clearValidators();
        control?.setValue('');
      }
      control?.updateValueAndValidity();
    });
  }

  // --- Step Navigation ---
  nextStep() {
    if (this.currentStep === 1) {
      if (this.checkControls(['fullName', 'email', 'phone', 'dob', 'gender', 'location'])) return;
    }
    
    if (this.currentStep === 2) {
      const basicEdu = ['degree', 'university', 'gradYear', 'cgpa', 'workStatus'];
      const expFields = this.isExperienced ? ['currentCompany', 'jobTitle', 'experienceYears', 'noticePeriod', 'currentCTC', 'expectedCTC'] : [];
      if (this.checkControls([...basicEdu, ...expFields])) return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.scrollTop();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollTop();
    }
  }

  private checkControls(fields: string[]): boolean {
    let invalid = false;
    fields.forEach(field => {
      const control = this.applyForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
        invalid = true;
      }
    });
    return invalid;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.applyForm.get(fieldName);
    return !!(control && control.invalid && control.touched);
  }

  // --- File Handling (Updated) ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        alert('File size exceeds 5MB limit.');
        return;
      }
      this.selectedFile = file; // Save file object for upload
      this.selectedFileName = file.name;
      this.fileError = false;
    }
  }

  // --- Real Submission Logic ---
  submitApplication() {
    if (!this.selectedFile) {
      this.fileError = true;
      return;
    }

    if (this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Prepare Payload
    const payload = {
      jobId: this.job?.id, // Ensure job ID is sent
      ...this.applyForm.value
    };

    // Call Real Service
    this.careerService.submitApplication(payload, this.selectedFile).subscribe({
      next: (response) => {
        console.log('Application Success:', response);
        this.isSubmitting = false;
        this.isSuccess = true;
      },
      error: (err) => {
        console.error('Submission Error:', err);
        this.isSubmitting = false;
        this.errorMessage = 'Failed to submit application. Please try again.';
        alert('Something went wrong. Please check console or try again.');
      }
    });
  }

  closeModal() {
    this.close.emit();
  }

  private scrollTop() {
    const container = document.querySelector('.form-body');
    if (container) container.scrollTop = 0;
  }
}