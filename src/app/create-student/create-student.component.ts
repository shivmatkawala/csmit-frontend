import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-student',
  templateUrl: './create-student.component.html',
  styleUrls: ['./create-student.component.css']
})
export class CreateStudentComponent implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private apiService = inject(ApiService);
  Validators = Validators;

  currentStep = signal(1);
  readonly totalSteps = 5;

  readonly steps = [
    { id: 1, name: 'Personal Info' },
    { id: 2, name: 'Education' },
    { id: 3, name: 'Experience' },
    { id: 4, name: 'Skills' },
    { id: 5, name: 'Projects' }
  ];

  modalMessage = signal('');
  selectedExperienceType = signal<'Fresher' | 'Intern' | 'Experienced'>('Fresher');
  experienceLevels = ['Fresher', 'Intern', 'Experienced'] as const;
  isSubmitted = signal(false);

  skillSearchControl = new FormControl('');
  filteredSuggestions = signal<string[]>([]);

  readonly suggestedSkills: string[] = [
    'Angular', 'React', 'Vue', 'JavaScript', 'TypeScript', 'Node.js',
    'Python', 'Java', 'SQL', 'MongoDB', 'Cloud (AWS/Azure/GCP)', 'Docker', 'Kubernetes'
  ];

  resumeForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    linkedin: ['', Validators.required],
    address: ['', Validators.required],
    portfolio: [''],

    education: this.fb.array([this.newEducation()], Validators.required),
    experienceType: ['Fresher', Validators.required],
    experience: this.fb.array([]),
    skills: this.fb.array([this.newSkill()]),
    projects: this.fb.array([this.newProject()]),
  });

  // Mapping top-level controls to steps dynamically
  private stepControlsMap = {
    1: ['fullName', 'email', 'phone', 'linkedin', 'address', 'portfolio'],
    2: ['education'],
    3: ['experienceType', 'experience'],
    4: ['skills'],
    5: ['projects']
  };

  ngOnInit(): void {
    this.setupExperienceTypeSubscription();
    this.setupSkillSearchSubscription();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackStepId(index: number, step: { id: number }) { return step.id; }

  isInvalid(controlName: string): boolean {
    const control = this.resumeForm.get(controlName);
    return !!(control && control.invalid && (control.touched || this.isSubmitted()));
  }

  private scrollToFirstError(): void {
    const firstInvalid = document.querySelector('.ng-invalid.ng-touched:not(form)');
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private findFirstInvalidStep(): void {
    for (const step of this.steps) {
      const controlsToCheck = this.stepControlsMap[step.id as keyof typeof this.stepControlsMap] || [];
      let isStepInvalid = false;

      for (const controlName of controlsToCheck) {
        const control = this.resumeForm.get(controlName);

        if (control instanceof FormArray) {
          if (control.controls.some(item => item.invalid) || (controlName === 'education' && control.length === 0)) {
            isStepInvalid = true; break;
          }
        } else if (control?.invalid) {
          isStepInvalid = true; break;
        }
      }

      if (isStepInvalid) {
        this.currentStep.set(step.id);
        setTimeout(() => this.scrollToFirstError(), 100);
        return;
      }
    }
  }

  private logFormArrayErrors(arrayName: string): void {
    const arrayControl = this.resumeForm.get(arrayName) as FormArray;
    arrayControl?.controls.forEach((control, index) => {
      if (control.invalid) {
        console.log(`❌ ${arrayName}[${index}] is Invalid:`, control.errors);
        if (control instanceof FormGroup) {
          Object.keys(control.controls).forEach(key => {
            const subControl = control.get(key);
            if (subControl?.invalid) {
              console.log(` - ${arrayName}[${index}].${key} Errors:`, subControl.errors);
            }
          });
        }
      }
    });
  }

  // Step Navigation
  nextStep(): void {
    const currentControls = this.getCurrentStepControls();
    currentControls.forEach(c => c.markAllAsTouched());
    let isValid = currentControls.every(c => c.valid);

    // Conditional checks for arrays
    if (this.currentStep() === 2 && this.educationControls.length === 0) isValid = false;
    if (this.currentStep() === 3 && ['Intern', 'Experienced'].includes(this.selectedExperienceType()) && this.experienceControls.length === 0) isValid = false;

    if (isValid && this.currentStep() < this.totalSteps) {
      this.currentStep.update(n => n + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.modalMessage.set('Please fill all mandatory fields in this step.');
      setTimeout(() => this.scrollToFirstError(), 0);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) this.currentStep.update(n => n - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private getCurrentStepControls(): AbstractControl[] {
    const controls: AbstractControl[] = [];
    const controlNames = this.stepControlsMap[this.currentStep() as keyof typeof this.stepControlsMap] || [];
    controlNames.forEach(name => controls.push(this.resumeForm.get(name)!));
    return controls;
  }

  get educationControls() { return this.resumeForm.get('education') as FormArray; }
  get experienceControls() { return this.resumeForm.get('experience') as FormArray; }
  get skillsControls() { return this.resumeForm.get('skills') as FormArray; }
  get projectsControls() { return this.resumeForm.get('projects') as FormArray; }

  // Education
  private newEducation(): FormGroup {
    const group = this.fb.group({
      degree: ['', Validators.required],
      institution: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      isCurrent: [false],
      grade: ['']
    });
    this.setupConditionalEndDateValidation(group);
    return group;
  }

  addEducation(): void { this.educationControls.push(this.newEducation()); }
  removeEducation(index: number): void { this.educationControls.removeAt(index); }

  // Experience
  private newExperience(): FormGroup {
    const group = this.fb.group({
      title: ['', Validators.required],
      company: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      isCurrent: [false],
      description: ['', Validators.required]
    });
    this.setupConditionalEndDateValidation(group);
    return group;
  }

  addExperience(): void { this.experienceControls.push(this.newExperience()); }
  removeExperience(index: number): void { this.experienceControls.removeAt(index); }

  private setupExperienceTypeSubscription(): void {
    this.resumeForm.get('experienceType')?.valueChanges.pipe(
      takeUntil(this.destroy$), distinctUntilChanged()
    ).subscribe(type => {
      this.selectedExperienceType.set(type);
      this.updateExperienceValidation(type);
    });
  }

  private updateExperienceValidation(type: 'Fresher' | 'Intern' | 'Experienced'): void {
    const shouldValidate = type !== 'Fresher';
    this.experienceControls.controls.forEach(c => {
      ['title', 'company', 'description'].forEach(field => {
        const control = c.get(field);
        if (!control) return;
        shouldValidate ? control.addValidators(Validators.required) : control.removeValidators(Validators.required);
        control.updateValueAndValidity();
      });
    });

    if (type === 'Fresher') this.experienceControls.clear();
    else if (this.experienceControls.length === 0) this.addExperience();
  }

  private setupConditionalEndDateValidation(group: FormGroup) {
    const isCurrent = group.get('isCurrent')!;
    const endDate = group.get('endDate')!;
    isCurrent.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(current => {
      current ? endDate.clearValidators() : endDate.setValidators(Validators.required);
      current ? endDate.disable() : endDate.enable();
      endDate.updateValueAndValidity();
    });
  }

  // Skills
  private newSkill(): FormGroup { return this.fb.group({ name: ['', Validators.required], level: ['', Validators.required] }); }
  addSkill(): void { this.skillsControls.push(this.newSkill()); }
  removeSkill(index: number): void {
    this.skillsControls.removeAt(index);
    if (this.skillsControls.length === 0) this.addSkill();
  }

  setupSkillSearchSubscription(): void {
    this.skillSearchControl.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(term => {
      const t = (term || '').toLowerCase();
      this.filteredSuggestions.set(t ? this.suggestedSkills.filter(s => s.toLowerCase().includes(t)).slice(0, 5) : []);
    });
  }

  selectSkillSuggestion(suggestion: string): void {
    const last = this.skillsControls.at(this.skillsControls.length - 1);
    if (last && !last.get('name')?.value) last.get('name')?.setValue(suggestion.trim());
    else {
      this.addSkill();
      this.skillsControls.at(this.skillsControls.length - 1).get('name')?.setValue(suggestion.trim());
    }
    this.skillSearchControl.setValue('');
    this.filteredSuggestions.set([]);
  }

  // Projects
  private newProject(): FormGroup {
    return this.fb.group({
      title: ['', Validators.required],
      duration: [''],
      role: [''],
      url: [''],
      description: [''],
      techUsed: ['']
    });
  }
  addProject(): void { this.projectsControls.push(this.newProject()); }
  removeProject(index: number): void { this.projectsControls.removeAt(index); }

  // Submit
  // onSubmit(): void {
  //   this.isSubmitted.set(true);
  //   this.resumeForm.markAllAsTouched();
  //   this.trimAllInputs();

  //   if (!this.resumeForm.valid) {
  //     this.logFormArrayErrors('education');
  //     this.logFormArrayErrors('experience');
  //     this.logFormArrayErrors('skills');
  //     this.logFormArrayErrors('projects');
  //     this.findFirstInvalidStep();
  //     this.modalMessage.set('Please fill all mandatory fields.');
  //     return;
  //   }

  //   const formValue = this.resumeForm.value;
  //   const cleanedData = {
  //     fullName: formValue.fullName.trim(),
  //     email: formValue.email.trim(),
  //     phone: formValue.phone.trim(),
  //     linkedin: formValue.linkedin.trim(),
  //     address: formValue.address.trim(),
  //     portfolio: formValue.portfolio?.trim(),
  //     experienceType: formValue.experienceType,
  //     education: formValue.education.filter((e: any) => e.degree?.trim() !== ''),
  //     experience: formValue.experience.filter((e: any) => e.title?.trim() !== ''),
  //     skills: formValue.skills.filter((s: any) => s.name?.trim() !== ''),
  //     projects: formValue.projects.filter((p: any) => p.title?.trim() !== '')
  //   };

  //   const apiPayload = {
  //     full_name: cleanedData.fullName,
  //     email: cleanedData.email,
  //     phone: cleanedData.phone,
  //     location: cleanedData.address,
  //     linkedin: cleanedData.linkedin,
  //     portfolio: cleanedData.portfolio,
  //     experience_type: cleanedData.experienceType,
  //     education: cleanedData.education.map((edu: any) => ({
  //       degree: edu.degree, institution: edu.institution,
  //       start_year: edu.startDate ? new Date(edu.startDate).getFullYear() : null,
  //       end_year: edu.endDate ? new Date(edu.endDate).getFullYear() : (edu.isCurrent ? new Date().getFullYear() : null),
  //       grade: edu.grade
  //     })),
  //     experience: cleanedData.experience.map((exp: any) => ({
  //       title: exp.title, company: exp.company,
  //       start_date: exp.startDate,
  //       end_date: exp.isCurrent ? null : exp.endDate,
  //       description: exp.description
  //     })),
  //     skills: cleanedData.skills.map((s: any) => ({ name: s.name })),
  //     projects: cleanedData.projects.map((p: any) => ({
  //       title: p.title, duration: p.duration, role: p.role, url: p.url,
  //       description: p.description, tech_used: p.techUsed
  //     }))
  //   };

  //   this.resumeForm.disable();
  //   this.apiService.submitResume(apiPayload).pipe(
  //     finalize(() => this.resumeForm.enable())
  //   ).subscribe({
  //     next: res => {
  //       this.modalMessage.set('Resume submitted successfully!');
  //       this.resumeForm.reset({ experienceType: 'Fresher' });
  //       this.currentStep.set(1);
  //       this.skillsControls.clear(); this.addSkill();
  //       this.educationControls.clear(); this.addEducation();
  //       this.projectsControls.clear(); this.addProject();
  //       this.experienceControls.clear();
  //       this.isSubmitted.set(false);
  //     },
  //     error: (err: HttpErrorResponse) => {
  //       console.error(err);
  //       this.modalMessage.set('An error occurred while submitting resume.');
  //     }
  //   });
  // }
  onSubmit(): void {
  this.isSubmitted.set(true);
  this.resumeForm.markAllAsTouched();
  this.trimAllInputs();

  if (!this.resumeForm.valid) {
    this.logFormArrayErrors('education');
    this.logFormArrayErrors('experience');
    this.logFormArrayErrors('skills');
    this.logFormArrayErrors('projects');
    this.findFirstInvalidStep();
    this.modalMessage.set('Please fill all mandatory fields.');
    return;
  }

  const formValue = this.resumeForm.value;
  const cleanedData = {
    fullName: formValue.fullName.trim(),
    email: formValue.email.trim(),
    phone: formValue.phone.trim(),
    linkedin: formValue.linkedin.trim(),
    address: formValue.address.trim(),
    portfolio: formValue.portfolio?.trim(),
    experienceType: formValue.experienceType,
    education: formValue.education.filter((e: any) => e.degree?.trim() !== ''),
    experience: formValue.experience.filter((e: any) => e.title?.trim() !== ''),
    skills: formValue.skills.filter((s: any) => s.name?.trim() !== ''),
    projects: formValue.projects.filter((p: any) => p.title?.trim() !== '')
  };

  const apiPayload = {
    full_name: cleanedData.fullName,
    email: cleanedData.email,
    phone: cleanedData.phone,
    location: cleanedData.address,
    linkedin: cleanedData.linkedin,
    portfolio: cleanedData.portfolio,
    experience_type: cleanedData.experienceType,
    education: cleanedData.education.map((edu: any) => ({
      degree: edu.degree,
      institution: edu.institution,
      start_year: edu.startDate ? new Date(edu.startDate).getFullYear() : null,
      end_year: edu.endDate ? new Date(edu.endDate).getFullYear() : (edu.isCurrent ? new Date().getFullYear() : null),
      grade: edu.grade
    })),
    experience: cleanedData.experience.map((exp: any) => ({
      title: exp.title,
      company: exp.company,
      start_date: exp.startDate,
      end_date: exp.isCurrent ? null : exp.endDate,
      description: exp.description
    })),
    skills: cleanedData.skills.map((s: any) => ({ name: s.name })),
    projects: cleanedData.projects.map((p: any) => ({
      title: p.title,
      duration: p.duration,
      role: p.role,
      url: p.url,
      description: p.description,
      tech_used: p.techUsed
    }))
  };

  this.resumeForm.disable();

  this.apiService.submitResume(apiPayload).pipe(
    finalize(() => this.resumeForm.enable())
  ).subscribe({
    next: res => {
      // ✅ Backend now returns username, password, role_id
      const { message, username, password, role_id } = res;

      // Optional: display a success modal or alert
      this.modalMessage.set(
        `🎉 ${message}\n\n` +
        `👤 Username: ${username}\n🔑 Password: ${password}\n🧩 Role ID: ${role_id}`
      );

      // Reset the form and arrays
      this.resumeForm.reset({ experienceType: 'Fresher' });
      this.currentStep.set(1);
      this.skillsControls.clear(); this.addSkill();
      this.educationControls.clear(); this.addEducation();
      this.projectsControls.clear(); this.addProject();
      this.experienceControls.clear();
      this.isSubmitted.set(false);
    },
    error: (err: HttpErrorResponse) => {
      console.error(err);
      this.modalMessage.set('❌ An error occurred while submitting the resume.');
    }
  });
}


  private trimAllInputs(): void {
    Object.keys(this.resumeForm.controls).forEach(key => {
      const control = this.resumeForm.get(key);
      if (control instanceof FormControl && typeof control.value === 'string') {
        control.setValue(control.value.trim());
      } else if (control instanceof FormArray) {
        control.controls.forEach(cg => {
          if (cg instanceof FormGroup) {
            Object.keys(cg.controls).forEach(k => {
              const sc = cg.get(k);
              if (sc instanceof FormControl && typeof sc.value === 'string') sc.setValue(sc.value.trim());
            });
          }
        });
      }
    });
  }
}
