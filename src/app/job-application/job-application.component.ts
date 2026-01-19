import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CareerService } from '../services/careers.service';
import { AlertService } from '../services/alert.service'; // Import AlertService

@Component({
  selector: 'app-job-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './job-application.component.html',
  styleUrls: ['./job-application.component.css']
})
export class JobApplicationComponent implements OnInit {
  @Input() job: any;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private careerService = inject(CareerService);
  private alertService = inject(AlertService); // Inject AlertService

  applyForm: FormGroup;
  
  currentStep = 1;
  totalSteps = 3;
  
  selectedFile: File | null = null;
  selectedFileName = '';
  fileError = false;
  isSubmitting = false;
  isSuccess = false;
  errorMessage = '';

  isExperienced = false;
  isManualCode = false;
  maxDate: string = '';
  
  phoneHint: string = 'Valid number required';

  countryCodes = [
    { code: '+91', country: 'India', len: 10 },
    { code: '+1', country: 'USA', len: 10 },
    { code: '+44', country: 'UK', len: 10 },
    { code: '+61', country: 'Australia', len: 9 },
    { code: '+971', country: 'UAE', len: 9 },
    { code: '+81', country: 'Japan', len: 10 },
    { code: '+49', country: 'Germany', min: 10, max: 11 },
    { code: '+33', country: 'France', len: 9 },
    { code: '+86', country: 'China', len: 11 },
    { code: '+65', country: 'Singapore', len: 8 },
    { code: 'Other', country: 'Other', min: 7, max: 15 }
  ];

  private emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private integerRegex = /^[0-9]+$/;       
  private numericRegex = /^[0-9.]+$/;      

  constructor() {
    this.applyForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.pattern(this.emailRegex)]],
      countryCode: ['+91', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(this.integerRegex)]],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      location: ['', Validators.required],

      degree: ['', Validators.required],
      university: ['', Validators.required],
      gradYear: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]], 
      cgpa: ['', [Validators.required, Validators.pattern(this.numericRegex)]], 
      
      workStatus: ['Fresher', Validators.required],
      currentCompany: [''],
      jobTitle: [''],
      experienceYears: [''],
      noticePeriod: [''],
      currentCTC: [''],
      expectedCTC: [''],
      linkedin: [''],
      portfolio: [''],
    });

    this.applyForm.get('workStatus')?.valueChanges.subscribe(value => {
      this.updateExperienceValidators(value === 'Experienced');
    });

    this.applyForm.get('countryCode')?.valueChanges.subscribe(val => {
      if (val === 'Other') {
        this.isManualCode = true;
        this.applyForm.patchValue({ countryCode: '' }, { emitEvent: false });
        this.phoneHint = 'Valid number required';
        this.updatePhoneValidators('Other');
        return;
      }
      this.isManualCode = false;
      this.updatePhoneValidators(val);
    });
    
    this.updatePhoneValidators('+91');
  }

  ngOnInit() {
    this.maxDate = new Date().toISOString().split('T')[0];
  }

  updatePhoneValidators(code: string) {
    const phoneControl = this.applyForm.get('phone');
    phoneControl?.clearValidators();

    const baseValidators = [Validators.required, Validators.pattern(this.integerRegex)];
    
    const rule = this.countryCodes.find(c => c.code === code);

    if (rule) {
      if (rule.len) {
        phoneControl?.setValidators([
          ...baseValidators,
          Validators.minLength(rule.len),
          Validators.maxLength(rule.len)
        ]);
        this.phoneHint = `Valid ${rule.len}-digit number required`;
      } else if (rule.min && rule.max) {
        phoneControl?.setValidators([
          ...baseValidators,
          Validators.minLength(rule.min),
          Validators.maxLength(rule.max)
        ]);
        this.phoneHint = `Valid ${rule.min}-${rule.max} digit number required`;
      }
    } else {
      phoneControl?.setValidators([
        ...baseValidators,
        Validators.minLength(7),
        Validators.maxLength(15)
      ]);
      this.phoneHint = 'Valid number required';
    }
    
    phoneControl?.updateValueAndValidity();
  }

  updateExperienceValidators(isExp: boolean) {
    this.isExperienced = isExp;
    const fields = ['currentCompany', 'jobTitle', 'experienceYears', 'noticePeriod', 'currentCTC', 'expectedCTC'];
    
    fields.forEach(field => {
      const control = this.applyForm.get(field);
      if (isExp) {
        if (field === 'experienceYears') {
          control?.setValidators([Validators.required, Validators.pattern(this.numericRegex)]);
        } else {
          control?.setValidators([Validators.required]);
        }
      } else {
        control?.clearValidators();
        control?.setValue('');
      }
      control?.updateValueAndValidity();
    });
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (this.checkControls(['fullName', 'email', 'phone', 'dob', 'gender', 'location', 'countryCode'])) return;
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        this.alertService.warning('File size exceeds 5MB limit.', 'File Too Large');
        return;
      }
      this.selectedFile = file; 
      this.selectedFileName = file.name;
      this.fileError = false;
    }
  }

  submitApplication() {
    if (!this.selectedFile) {
      this.fileError = true;
      this.alertService.validation('Please upload your resume before submitting.', 'Resume Missing');
      return;
    }

    if (this.applyForm.invalid) {
      this.applyForm.markAllAsTouched();
      this.alertService.validation('Please fill in all required fields correctly.', 'Invalid Form');
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.applyForm.value;
    const code = formValue.countryCode ? formValue.countryCode.trim() : '';
    const fullPhoneNumber = `${code} ${formValue.phone}`;

    const payload = {
      jobId: this.job?.id, 
      ...formValue,
      phone: fullPhoneNumber 
    };

    delete payload.countryCode;

    this.careerService.submitApplication(payload, this.selectedFile).subscribe({
      next: (response) => {
        // --- 1. Success Alert (Requested by user) ---
        this.alertService.success(
          'Your application has been submitted successfully. Please check your email for confirmation.',
          'Application Received!'
        );
        this.isSubmitting = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isSubmitting = false;
        
        // --- 2. Extract Error Message from Backend (for Duplicates) ---
        const errorMsg = err.error?.error || 'Failed to submit application. Please try again.';
        
        if (errorMsg.toLowerCase().includes('already applied')) {
           // Warning for duplicate application
           this.alertService.warning(errorMsg, 'Application Exists');
        } else {
           // Generic Error
           this.alertService.error(errorMsg, 'Submission Failed');
        }
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