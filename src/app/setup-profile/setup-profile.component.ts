import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs'; 
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators'; 
import { ResumeService, SkillMaster, ProficiencyLevel, SetupData, ApiPayload } from '../services/create-resume.service'; 
import { AlertService } from '../services/alert.service'; 
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-setup-profile',
  templateUrl: './setup-profile.component.html',
  styleUrls: ['./setup-profile.component.css']
})
export class SetupProfileComponent implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private resumeService = inject(ResumeService); 
  private alertService = inject(AlertService); 

  // Stepper State
  currentStep = signal(1);
  readonly totalSteps = 5;
  
  // User Info
  currentUserId = signal<string | null>(null);
  userRole = signal<string>('student'); 

  readonly steps = [
    { id: 1, name: 'Personal' },
    { id: 2, name: 'Education' },
    { id: 3, name: 'Experience' },
    { id: 4, name: 'Skills' },
    { id: 5, name: 'Projects' }
  ];

  isSubmitted = signal(false);
  isLoading = signal(false);

  // API Data Signals
  skillMasterList = signal<SkillMaster[]>([]);
  proficiencyList = signal<ProficiencyLevel[]>([]);
  techStackList = signal<{tech_stackid: number, techname: string}[]>([]); // Added to store tech stacks
  skillSearchControl = new FormControl('');
  filteredSuggestions = signal<string[]>([]);

  // Main Form with strict patterns
  resumeForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    dob: ['', Validators.required], 
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    linkedin: ['', [Validators.required, Validators.pattern('^(https?:\\/\\/)?(www\\.)?linkedin\\.com\\/.*$')]],
    address: ['', Validators.required], 
    portfolio: ['', Validators.pattern('^(https?:\\/\\/)?(www\\.)?github\\.com\\/.*$')], 

    education: this.fb.array([]),
    experienceType: ['Fresher', Validators.required],
    experience: this.fb.array([]),
    skills: this.fb.array([]),
    projects: this.fb.array([]),
  });

  ngOnInit(): void {
    this.loadSessionData();
    this.fetchSetupData(); 
    this.initFormArrays();
    this.setupSubscriptions();
  }

  private loadSessionData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
        const loginData = localStorage.getItem('cshub_student_login_data') || sessionStorage.getItem('cshub_student_login_data');
        if (loginData) {
          const parsed = JSON.parse(loginData);
          this.currentUserId.set(parsed.userId);
          this.userRole.set(parsed.role_id === 2 ? 'student' : 'trainer');
        }
    }
  }

  private initFormArrays(): void {
    // We start with at least one item for education and skills
    if (this.educationArr.length === 0) this.addEducation();
    if (this.skillsArr.length === 0) this.addSkill();
    if (this.projectsArr.length === 0) this.addProject();
  }

  fetchSetupData(): void {
    this.resumeService.getSetupData().subscribe({
      next: (data: SetupData) => {
        if(data && data.skills) this.skillMasterList.set(data.skills.map((s: any) => ({ id: s.skillmasterid, skillName: s.skillname })));
        if(data && data.proficiencies) this.proficiencyList.set(data.proficiencies.map((p: any) => ({ id: p.proficiencyid, levelName: p.levelname })));
        if(data && data.techStacks) this.techStackList.set(data.techStacks); // Store Tech Stacks
      },
      error: () => this.alertService.error('Could not load technical setup data from server.')
    });
  }

  private setupSubscriptions(): void {
    this.resumeForm.get('experienceType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type: string) => {
      // If switched to Fresher, clear experience. If not, ensure at least one row exists.
      if (type === 'Fresher') {
        this.experienceArr.clear();
      } else {
        if (this.experienceArr.length === 0) this.addExperience();
      }
    });

    this.skillSearchControl.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe((term: string | null) => {
      if (!term) { this.filteredSuggestions.set([]); return; }
      const list = this.skillMasterList().map((s: SkillMaster) => s.skillName);
      this.filteredSuggestions.set(list.filter((s: string) => s.toLowerCase().includes(term.toLowerCase())).slice(0, 5));
    });
  }

  get educationArr(): FormArray { return this.resumeForm.get('education') as FormArray; }
  get experienceArr(): FormArray { return this.resumeForm.get('experience') as FormArray; }
  get skillsArr(): FormArray { return this.resumeForm.get('skills') as FormArray; }
  get projectsArr(): FormArray { return this.resumeForm.get('projects') as FormArray; }

  // --- ADD METHODS ---
  addEducation(): void {
    this.educationArr.push(this.fb.group({
      degree: ['', Validators.required],
      institution: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      isCurrent: [false],
      grade: ['', Validators.required]
    }));
  }

  addExperience(): void {
    this.experienceArr.push(this.fb.group({
      title: ['', Validators.required],
      company: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      isCurrent: [false],
      description: ['', [Validators.required, Validators.minLength(20)]]
    }));
  }

  addSkill(): void {
    this.skillsArr.push(this.fb.group({
      name: ['', Validators.required],
      level: ['', Validators.required]
    }));
  }

  addProject(): void {
    this.projectsArr.push(this.fb.group({
      title: ['', Validators.required],
      url: ['', Validators.pattern('^(https?:\\/\\/)?(www\\.)?github\\.com\\/.*$')],
      description: ['', Validators.required],
      techUsed: ['', Validators.required] // Ensure this is bound to input
    }));
  }

  // --- REMOVE METHODS ---
  removeEducation(index: number): void {
      this.educationArr.removeAt(index);
  }

  removeExperience(index: number): void {
      this.experienceArr.removeAt(index);
  }

  removeSkill(index: number): void {
      this.skillsArr.removeAt(index);
  }

  removeProject(index: number): void {
      this.projectsArr.removeAt(index);
  }

  // --- NAVIGATION ---
  nextStep(): void {
    const currentStepId = this.currentStep();
    const currentControls = this.getControlsByStep(currentStepId);
    let isStepValid = true;
    
    // Validate controls
    currentControls.forEach((ctrl: any) => {
        if (ctrl instanceof FormArray) {
            ctrl.controls.forEach((group: any) => {
                this.markFormGroupTouched(group); // Helper function usage
                if (group.invalid) isStepValid = false;
            });
        } else {
            ctrl.markAsTouched();
            if (ctrl.invalid) isStepValid = false;
        }
    });

    if (currentStepId === 3 && this.resumeForm.get('experienceType')?.value !== 'Fresher' && this.experienceArr.length === 0) {
        this.alertService.warning('Please add at least one experience detail or select "Fresher".');
        return;
    }
    
    if (isStepValid && this.currentStep() < this.totalSteps) {
      this.currentStep.update((v: number) => v + 1);
      window.scrollTo(0, 0);
    } else {
      if (!isStepValid) {
          this.alertService.warning('Please correct the highlighted errors before proceeding.');
      }
    }
  }

  // Helper to deep mark touched
  private markFormGroupTouched(formGroup: FormGroup | AbstractControl) {
    if (formGroup instanceof FormGroup) {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    } else {
        formGroup.markAsTouched();
    }
  }

  private getControlsByStep(step: number): any[] {
    const map: any = {
      1: ['fullName', 'dob', 'email', 'phone', 'linkedin', 'address'],
      2: ['education'],
      3: ['experienceType', 'experience'], 
      4: ['skills'],
      5: ['projects']
    };
    return map[step].map((name: string) => this.resumeForm.get(name));
  }

  prevStep(): void {
    if (this.currentStep() > 1) this.currentStep.update((v: number) => v - 1);
    window.scrollTo(0, 0);
  }

  onSubmit(): void {
    this.isSubmitted.set(true);
    
    if (this.resumeForm.invalid) {
      this.markFormGroupTouched(this.resumeForm); // Ensure EVERYTHING is touched
      this.alertService.validation('Form is incomplete. Please review all red-marked fields.');
      return;
    }

    const userId = this.currentUserId();
    if (!userId) {
      this.alertService.error('Session expired. Please log in again.');
      return;
    }

    this.isLoading.set(true);
    const val = this.resumeForm.getRawValue();
    const nameParts = val.fullName.trim().split(' ');

    const payload: ApiPayload = {
      userId: userId,
      personalInfo: {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || nameParts[0],
        dob: val.dob,
        email: val.email,
        phone: val.phone,
        linkedinId: val.linkedin.split('/').pop() || '',
        githubId: val.portfolio?.split('/').pop() || ''
      },
      education: val.education.map((e: any) => ({
        qualification_type: 'Degree',
        qualification: e.degree,
        university: e.institution,
        joined_on: `${e.startDate}-01`,
        left_on: e.isCurrent ? null : (e.endDate ? `${e.endDate}-01` : null),
        marks: e.grade,
        marking_system: 'CGPA'
      })),
      experience: val.experienceType === 'Fresher' ? [] : val.experience.map((ex: any) => ({
        position: ex.title,
        company: ex.company,
        joined_on: `${ex.startDate}-01`,
        left_on: ex.isCurrent ? null : (ex.endDate ? `${ex.endDate}-01` : null),
        location: val.address,
        worked_on: ex.description
      })),
      skills: val.skills.map((s: any) => ({
        skillMasterId: this.skillMasterList().find((m: SkillMaster) => m.skillName.toLowerCase() === s.name.toLowerCase())?.id || 1,
        proficiencyId: this.proficiencyList().find((p: ProficiencyLevel) => p.levelName.toLowerCase() === s.level.toLowerCase())?.id || 1
      })),
      projects: val.projects.map((p: any) => {
        
        // --- FIX: Logic to map comma-separated text to Backend Tech Stack IDs ---
        const userTechs = p.techUsed ? p.techUsed.split(',') : [];
        const mappedTechStacks = userTechs.map((t: string) => {
             const cleanName = t.trim().toLowerCase();
             const found = this.techStackList().find(ts => ts.techname.toLowerCase() === cleanName);
             return found ? { tech_stackId: found.tech_stackid, techName: found.techname } : null;
        }).filter((t: any) => t !== null);

        // If no matching tech stacks found, we send an empty array instead of hardcoded Docker
        // You might need to add a "Create Tech Stack" feature later if the backend requires IDs strictly
        
        return {
          projectName: p.title,
          githubLink: p.url,
          // FIX: Removed hardcoded [{tech_stackId: 1}] and replaced with mapped list
          techStack: mappedTechStacks.length > 0 ? mappedTechStacks : [], 
          descriptions: [{ description: p.description }]
        };
      })
    };

    this.resumeService.submitResume(payload).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: () => {
        localStorage.removeItem('STUDENT_DATA');
        sessionStorage.removeItem('STUDENT_DATA');
        localStorage.removeItem('cshub_profile_complete_once');
        sessionStorage.removeItem('cshub_profile_complete_once');
        localStorage.removeItem('cshub_profile_prompt_dismissed');

        this.alertService.success('Profile setup complete! Your resume data is now live.', 'Success');
        
        setTimeout(() => {
          const path = this.userRole() === 'student' ? 'student-dashboard' : 'trainer-dashboard';
          window.location.href = path;
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        this.alertService.error(err.error?.error || 'Server submission failed.');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}