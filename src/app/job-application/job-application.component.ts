import { Component, EventEmitter, Input, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CareerService } from '../services/careers.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-job-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './job-application.component.html',
  styleUrls: ['./job-application.component.css']
})
export class JobApplicationComponent implements OnInit {
  @Input() job: any;
  @Output() close = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private careerService = inject(CareerService);
  private alertService = inject(AlertService);

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
  
  // States for Country Code
  isManualCode = false;
  countrySelectValue = '+91';

  // States for Degree
  isManualDegree = false;
  degreeSelectValue = '';

  maxDate: string = '';
  
  // Lists
  countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+971', country: 'UAE' },
    { code: '+81', country: 'Japan' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+86', country: 'China' },
    { code: '+65', country: 'Singapore' },
    { code: 'Others', country: 'Enter Code' }
  ];

  degrees = [
    'B.Tech / B.E.', 
    'M.Tech / M.E.', 
    'MBA / PGDM', 
    'MCA', 
    'BCA', 
    'B.Sc', 
    'M.Sc'
  ];

  // Regex Patterns
  private nameRegex = /^[a-zA-Z\s.]+$/; 
  private emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private integerRegex = /^[0-9]+$/;       
  private numericRegex = /^[0-9]+(\.[0-9]{1,2})?$/;
  private cgpaRegex = /^[0-9]+(\.[0-9]{1,2})?%?$/;
  private yearRegex = /^(19|20)\d{2}$/;
  // NEW: DOB Regex ensures year starts with 19 or 20 (Format: YYYY-MM-DD)
  private dobRegex = /^(19|20)\d{2}-\d{2}-\d{2}$/;

  constructor() {
    this.applyForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(this.nameRegex)]],
      email: ['', [Validators.required, Validators.pattern(this.emailRegex)]],
      countryCode: ['+91', Validators.required],
      phone: ['', [
        Validators.required, 
        Validators.pattern(this.integerRegex), 
        Validators.minLength(7), 
        Validators.maxLength(15)
      ]],
      // UPDATED: Added Pattern Validator for DOB
      dob: ['', [Validators.required, Validators.pattern(this.dobRegex)]],
      gender: ['', Validators.required],
      location: ['', Validators.required],

      // Education & Work
      degree: ['', Validators.required],
      university: ['', Validators.required],
      gradYear: ['', [Validators.required, Validators.pattern(this.yearRegex)]], 
      cgpa: ['', [
        Validators.required, 
        Validators.pattern(this.cgpaRegex),
        Validators.max(100)
      ]], 
      
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
  }

  ngOnInit() {
    this.maxDate = new Date().toISOString().split('T')[0];
  }

  // --- Country Code Logic ---
  onCountryChange(val: string) {
    this.countrySelectValue = val;
    if (val === 'Others') {
      this.isManualCode = true;
      this.applyForm.patchValue({ countryCode: '+' });
    } else {
      this.isManualCode = false;
      this.applyForm.patchValue({ countryCode: val });
    }
  }

  sanitizeCountryCode(event: any) {
    let value = event.target.value;
    if (!value.startsWith('+')) {
      value = '+' + value.replace(/[^0-9]/g, '');
    } else {
      value = '+' + value.substring(1).replace(/[^0-9]/g, '');
    }
    this.applyForm.get('countryCode')?.setValue(value, { emitEvent: false });
  }

  // --- Degree Logic ---
  onDegreeChange(val: string) {
    this.degreeSelectValue = val;
    if (val === 'Other') {
      this.isManualDegree = true;
      this.applyForm.patchValue({ degree: '' }); // Clear for manual input
    } else {
      this.isManualDegree = false;
      this.applyForm.patchValue({ degree: val });
    }
  }

  resetDegree() {
    this.isManualDegree = false;
    this.degreeSelectValue = '';
    this.applyForm.patchValue({ degree: '' });
  }

  updateExperienceValidators(isExp: boolean) {
    this.isExperienced = isExp;
    const fields = ['currentCompany', 'jobTitle', 'experienceYears', 'noticePeriod', 'currentCTC', 'expectedCTC'];
    
    fields.forEach(field => {
      const control = this.applyForm.get(field);
      if (isExp) {
        if (field === 'experienceYears') {
          control?.setValidators([
            Validators.required, 
            Validators.pattern(this.numericRegex), 
            Validators.max(50)
          ]);
        } else if (field === 'currentCTC' || field === 'expectedCTC') {
          control?.setValidators([
            Validators.required,
            Validators.pattern(this.numericRegex),
            Validators.max(100)
          ]);
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
      
      const code = this.applyForm.get('countryCode')?.value;
      if (this.isManualCode && (code === '+' || code.length < 2)) {
         this.alertService.validation('Please enter a valid country code (e.g., +1).', 'Invalid Code');
         return;
      }
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
        this.alertService.success(
          'Your application has been submitted successfully. Please check your email for confirmation.',
          'Application Received!'
        );
        this.isSubmitting = false;
        this.isSuccess = true;
      },
      error: (err) => {
        this.isSubmitting = false;
        
        const errorMsg = err.error?.error || 'Failed to submit application. Please try again.';
        
        if (errorMsg.toLowerCase().includes('already applied')) {
           this.alertService.warning(errorMsg, 'Application Exists');
        } else {
           this.alertService.error(errorMsg, 'Submission Failed');
        }
      }
    });
  }

  closeModal(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.close.emit();
  }

  private scrollTop() {
    const container = document.querySelector('.form-body');
    if (container) container.scrollTop = 0;
  }
}