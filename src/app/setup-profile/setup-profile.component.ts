import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl, AbstractControl } from '@angular/forms';
import { Subject, forkJoin, of, Observable, lastValueFrom } from 'rxjs'; 
import { debounceTime, distinctUntilChanged, takeUntil, finalize, catchError } from 'rxjs/operators'; 
import { ResumeService, SkillMaster, ProficiencyLevel, SetupData, ApiPayload } from '../services/create-resume.service'; 
import { AlertService } from '../services/alert.service'; 
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router'; 

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
  private router = inject(Router); 

  currentStep = signal(1);
  readonly totalSteps = 5;
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

  skillMasterList = signal<SkillMaster[]>([]);
  proficiencyList = signal<ProficiencyLevel[]>([]);
  techStackList = signal<{tech_stackid: number, techname: string}[]>([]); 
  
  skillSearchControl = new FormControl('');
  filteredSuggestions = signal<string[]>([]);

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
        const rawLoginData = localStorage.getItem('cshub_student_login_data') || 
                             sessionStorage.getItem('cshub_student_login_data') ||
                             localStorage.getItem('user_data');
                             
        if (rawLoginData) {
          const parsed = JSON.parse(rawLoginData);
          this.currentUserId.set(parsed.userId || parsed.uid || parsed.student_id);
          const roleId = Number(parsed.role_id || parsed.roleId || parsed.role_ID);
          this.userRole.set(roleId === 3 ? 'trainer' : 'student');
        }
    }
  }

  private initFormArrays(): void {
    if (this.educationArr.length === 0) this.addEducation();
    if (this.skillsArr.length === 0) this.addSkill();
    // Projects are optional
  }

  fetchSetupData(): void {
    this.resumeService.getSetupData().subscribe({
      next: (data: SetupData) => {
        if(data?.skills) this.skillMasterList.set(data.skills.map((s: any) => ({ id: s.skillmasterid, skillName: s.skillname })));
        if(data?.proficiencies) this.proficiencyList.set(data.proficiencies.map((p: any) => ({ id: p.proficiencyid, levelName: p.levelname })));
        if(data?.techStacks) this.techStackList.set(data.techStacks);
      },
      error: () => this.alertService.error('Could not load technical data.')
    });
  }

  private setupSubscriptions(): void {
    this.resumeForm.get('experienceType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((type: string) => {
      if (type === 'Fresher') {
        this.experienceArr.clear();
      } else if (this.experienceArr.length === 0) {
        this.addExperience();
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

  addEducation(): void {
    this.educationArr.push(this.fb.group({
      degree: ['', Validators.required], institution: ['', Validators.required],
      startDate: ['', Validators.required], endDate: [''], isCurrent: [false], grade: ['']
    }));
  }
  addExperience(): void {
    this.experienceArr.push(this.fb.group({
      title: ['', Validators.required], company: ['', Validators.required],
      startDate: ['', Validators.required], endDate: [''], isCurrent: [false], description: ['', [Validators.required, Validators.minLength(20)]]
    }));
  }
  addSkill(): void {
    this.skillsArr.push(this.fb.group({ name: ['', Validators.required], level: ['', Validators.required] }));
  }
  addProject(): void {
    this.projectsArr.push(this.fb.group({
      title: [''], url: ['', Validators.pattern('^(https?:\\/\\/)?(www\\.)?github\\.com\\/.*$')],
      description: [''], techUsed: ['']
    }));
  }
  
  removeEducation(i: number) { this.educationArr.removeAt(i); }
  removeExperience(i: number) { this.experienceArr.removeAt(i); }
  removeSkill(i: number) { this.skillsArr.removeAt(i); }
  removeProject(i: number) { this.projectsArr.removeAt(i); }

  nextStep(): void {
    const currentStepId = this.currentStep();
    const currentControls = this.getControlsByStep(currentStepId);
    let isStepValid = true;
    
    currentControls.forEach((ctrl: any) => {
        if (!ctrl) return;
        if (ctrl instanceof FormArray) {
            ctrl.controls.forEach((group: any) => { 
                this.markFormGroupTouched(group); 
                if (group.invalid) isStepValid = false; 
            });
        } else { 
            ctrl.markAsTouched(); 
            if (ctrl.invalid) isStepValid = false; 
        }
    });

    if (currentStepId === 3 && this.resumeForm.get('experienceType')?.value !== 'Fresher' && this.experienceArr.length === 0) {
        this.alertService.warning('Please add experience or select "Fresher".');
        return;
    }

    if (isStepValid && this.currentStep() < this.totalSteps) {
      this.currentStep.update(v => v + 1); window.scrollTo(0, 0);
    } else if (!isStepValid) {
      this.alertService.warning('Please fix errors before proceeding.');
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | AbstractControl) {
    if (formGroup instanceof FormGroup) {
        Object.values(formGroup.controls).forEach(c => { c.markAsTouched(); if (c instanceof FormGroup) this.markFormGroupTouched(c); });
    } else { formGroup.markAsTouched(); }
  }

  private getControlsByStep(step: number): any[] {
    const map: any = { 1: ['fullName', 'dob', 'email', 'phone', 'linkedin', 'address'], 2: ['education'], 3: ['experienceType', 'experience'], 4: ['skills'], 5: ['projects'] };
    return map[step].map((name: string) => this.resumeForm.get(name));
  }

  prevStep(): void { if (this.currentStep() > 1) this.currentStep.update(v => v - 1); window.scrollTo(0, 0); }

  async onSubmit(): Promise<void> {
    this.isSubmitted.set(true);
    if (this.resumeForm.invalid) {
      this.markFormGroupTouched(this.resumeForm);
      this.alertService.validation('The form is incomplete.');
      return;
    }

    const userId = this.currentUserId();
    if (!userId) { this.alertService.error('Session expired.'); return; }

    this.isLoading.set(true);
    const val = this.resumeForm.getRawValue();

    try {
        const newSkillsToCreate: string[] = [];
        const newTechsToCreate: string[] = [];

        val.skills.forEach((s: any) => {
            const clean = s.name.trim();
            const exists = this.skillMasterList().some(m => m.skillName.toLowerCase() === clean.toLowerCase());
            if (!exists && clean) newSkillsToCreate.push(clean);
        });

        val.projects.forEach((p: any) => {
            if (p.techUsed) {
                p.techUsed.split(',').forEach((t: string) => {
                    const clean = t.trim();
                    const exists = this.techStackList().some(ts => ts.techname.toLowerCase() === clean.toLowerCase());
                    if (!exists && clean && !newTechsToCreate.includes(clean)) newTechsToCreate.push(clean);
                });
            }
        });

        const creationPromises: Observable<any>[] = [];
        newSkillsToCreate.forEach(name => creationPromises.push(this.resumeService.addSkill(name).pipe(catchError(() => of(null)))));
        newTechsToCreate.forEach(name => creationPromises.push(this.resumeService.addTechStack(name).pipe(catchError(() => of(null)))));

        if (creationPromises.length > 0) {
             await lastValueFrom(forkJoin(creationPromises));
             const refreshedData = await lastValueFrom(this.resumeService.getSetupData());
             if (refreshedData.skills) this.skillMasterList.set(refreshedData.skills.map((s: any) => ({ id: s.skillmasterid, skillName: s.skillname })));
             if (refreshedData.techStacks) this.techStackList.set(refreshedData.techStacks);
        }

        const nameParts = val.fullName.trim().split(' ');
        
        const payload: ApiPayload = {
            userId: userId,
            personalInfo: {
                firstName: nameParts[0],
                lastName: nameParts.slice(1).join(' ') || nameParts[0],
                dob: val.dob, email: val.email, phone: val.phone,
                linkedinId: val.linkedin.split('/').pop() || '',
                githubId: val.portfolio?.split('/').pop() || ''
            },
            education: val.education.map((e: any) => ({
                qualification_type: 'Degree', qualification: e.degree, university: e.institution,
                joined_on: `${e.startDate}-01`, left_on: e.isCurrent ? null : (e.endDate ? `${e.endDate}-01` : null),
                marks: e.grade, marking_system: 'CGPA'
            })),
            experience: val.experienceType === 'Fresher' ? [] : val.experience.map((ex: any) => ({
                position: ex.title, company: ex.company,
                joined_on: `${ex.startDate}-01`, left_on: ex.isCurrent ? null : (ex.endDate ? `${ex.endDate}-01` : null),
                location: val.address, 
                worked_on: ex.description 
            })),
            skills: val.skills.map((s: any) => {
                const foundSkill = this.skillMasterList().find(m => m.skillName.toLowerCase() === s.name.trim().toLowerCase());
                const foundLevel = this.proficiencyList().find(p => p.levelName.toLowerCase() === s.level.trim().toLowerCase());
                if (foundSkill && foundLevel) return { skillMasterId: foundSkill.id, proficiencyId: foundLevel.id };
                return null;
            }).filter((s: any) => s !== null),

            projects: val.projects.filter((p: any) => p.title).map((p: any) => {
                const userTechs = p.techUsed ? p.techUsed.split(',') : [];
                const techStackIds = userTechs.map((t: string) => {
                    const cleanName = t.trim().toLowerCase();
                    const found = this.techStackList().find(ts => ts.techname.toLowerCase() === cleanName);
                    return found ? { tech_stackId: found.tech_stackid } : null;
                }).filter((t: any) => t !== null);

                return {
                    projectName: p.title,
                    githubLink: p.url,
                    techStack: techStackIds, 
                    descriptions: [{ description: p.description }]
                };
            })
        };

        this.resumeService.submitResume(payload).pipe(finalize(() => this.isLoading.set(false))).subscribe({
            next: () => this.handleSuccess(),
            error: (err: HttpErrorResponse) => this.alertService.error(err.error?.error || 'Failed to save data.')
        });

    } catch (error) {
        this.isLoading.set(false);
        this.alertService.error('An error occurred.');
    }
  }

  private handleSuccess() {
    localStorage.removeItem('STUDENT_DATA');
    sessionStorage.removeItem('STUDENT_DATA');
    localStorage.removeItem('cshub_profile_complete_once');
    this.alertService.success('Profile setup completed successfully!', 'Success');
    setTimeout(() => {
        this.goBack();
    }, 2000);
  }

  goBack(): void {
    const role = this.userRole();
    if (role === 'trainer') {
      this.router.navigate(['/trainer-dashboard']);
    } else {
      this.router.navigate(['/student-dashboard']);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}