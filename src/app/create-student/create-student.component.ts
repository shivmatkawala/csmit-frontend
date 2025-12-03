import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, FormControl } from '@angular/forms';
import { Observable, Subject, forkJoin, of, throwError } from 'rxjs'; 
import { debounceTime, distinctUntilChanged, takeUntil, finalize, catchError, concatMap, tap } from 'rxjs/operators'; 
import { ResumeService, SkillMaster, ProficiencyLevel, SetupData } from '../services/create-resume.service'; 
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-create-student',
  templateUrl: './create-student.component.html',
  styleUrls: ['./create-student.component.css']
})
export class CreateStudentComponent implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private resumeService = inject(ResumeService); 
  Validators = Validators;

  currentStep = signal(1);
  readonly totalSteps = 5;
  // State to hold the dynamic user ID
  currentUserId = signal<string | null>(null);

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
  
  // State to hold fetched setup data from API
  skillMasterList = signal<SkillMaster[]>([]);
  proficiencyList = signal<ProficiencyLevel[]>([]);

  resumeForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    dob: ['', Validators.required], 
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    linkedin: ['', Validators.required],
    address: ['', Validators.required], // City, State, Country
    portfolio: [''], // GitHub/Portfolio URL

    education: this.fb.array([this.newEducation()], Validators.required),
    experienceType: ['Fresher', Validators.required],
    experience: this.fb.array([]),
    skills: this.fb.array([this.newSkill()]),
    projects: this.fb.array([this.newProject()]),
  });

  private stepControlsMap = {
    1: ['fullName', 'dob', 'email', 'phone', 'linkedin', 'address', 'portfolio'],
    2: ['education'],
    3: ['experienceType', 'experience'],
    4: ['skills'],
    5: ['projects']
  };

  ngOnInit(): void {
    this.loadSessionData();
    this.fetchSetupData(); 
    this.setupExperienceTypeSubscription();
    this.setupSkillSearchSubscription();
  }
  
  loadSessionData(): void {
    if (typeof window !== 'undefined' && window.localStorage) { // FIX: Changed to localStorage
      // FIX: Check localStorage instead of sessionStorage
      // Note: Ensure your login logic also saves to localStorage now!
      const loginData = window.localStorage.getItem('cshub_student_login_data') || window.sessionStorage.getItem('cshub_student_login_data');
      let userId: string | null = null;
      
      if (loginData) {
          try {
              const parsedData = JSON.parse(loginData);
              userId = parsedData.userId; // Get userId from the stored login response
          } catch(e) {
              console.error("Error parsing login data:", e);
          }
      }
      
      this.currentUserId.set(userId); 
      
      if (!userId) {
        console.warn('CURRENT_USER_ID is not set in storage. Please ensure user is authenticated.');
      } else {
        console.log('User ID loaded/set in storage:', userId);
      }
    }
  }

  /**
   * Fetches the setup data (skills, tech stacks, proficiencies) and combines them for the local list.
   */
  fetchSetupData(): void {
      this.resumeService.getSetupData().subscribe({
          next: (data: SetupData) => {
              const allSkillsMap = new Map<string, SkillMaster>();

              // 1. Process standard skills
              if (data.skills && Array.isArray(data.skills)) {
                  data.skills.forEach(skill => {
                      allSkillsMap.set(skill.skillname.toLowerCase(), { id: skill.skillmasterid, skillName: skill.skillname });
                  });
              }
              
              // 2. Process tech stacks (Tech stack items might overlap with skills, so we prioritize the skill list for IDs)
              if (data.techStacks && Array.isArray(data.techStacks)) {
                  data.techStacks.forEach(tech => {
                      if (!allSkillsMap.has(tech.techname.toLowerCase())) {
                          allSkillsMap.set(tech.techname.toLowerCase(), { id: tech.tech_stackid, skillName: tech.techname });
                      }
                  });
              }

              this.skillMasterList.set(Array.from(allSkillsMap.values()));
              
              if (data.proficiencies && Array.isArray(data.proficiencies)) {
                const mappedProficiencies = data.proficiencies.map(p => ({
                    id: p.proficiencyid,
                    levelName: p.levelname as ProficiencyLevel['levelName']
                }));
                this.proficiencyList.set(mappedProficiencies);
              } else {
                this.proficiencyList.set([]); 
              }
              
              console.log('Setup Data fetched successfully (Total Skills/TechStacks:', this.skillMasterList().length, ', Proficiencies:', this.proficiencyList().length, ')');
          },
          error: (err: HttpErrorResponse) => {
              console.error('Failed to fetch setup data from API (Skills/Proficiency):', err);
              this.modalMessage.set(`❌ Setup Data Fetch Failed (${err.status}): Could not load Skills and Proficiency levels from API.`);
              this.skillMasterList.set([]); 
              this.proficiencyList.set([]);
              // Mock data fallback for UI testing (optional, usually kept empty in prod)
              this.proficiencyList.set([{id: 1, levelName: 'Beginner'}, {id: 2, levelName: 'Intermediate'}, {id: 3, levelName: 'Proficient'}, {id: 4, levelName: 'Advanced'}, {id: 5, levelName: 'Expert'}]);
              this.skillMasterList.set([{id: 1, skillName: 'Angular'}, {id: 2, skillName: 'Python'}, {id: 3, skillName: 'Django'}, {id: 4, skillName: 'Docker'}, {id: 5, skillName: 'Jenkins'}]);
          }
      });
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
    if (firstInvalid) {
        const parentSection = firstInvalid.closest('.form-section');
        if (parentSection) {
            parentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }

  private findFirstInvalidStep(): void {
    this.resumeForm.markAllAsTouched();
    
    for (const step of this.steps) {
      const controlsToCheck = this.stepControlsMap[step.id as keyof typeof this.stepControlsMap] || [];
      let isStepInvalid = false;

      // Check form group/control validity
      for (const controlName of controlsToCheck) {
        const control = this.resumeForm.get(controlName);
        if (control?.invalid) {
            if (control instanceof FormArray) {
                if (controlName === 'education' && control.length === 0) {
                    isStepInvalid = true; break;
                }
                if (control.controls.some(item => item.invalid)) {
                    isStepInvalid = true; break;
                }
            } else if (control?.invalid) {
                isStepInvalid = true; break;
            }
        }
      }
      
      // Additional conditional check for experience array
      if (step.id === 3 && ['Intern', 'Experienced'].includes(this.selectedExperienceType()) && this.experienceControls.length === 0) {
          isStepInvalid = true;
      }

      if (isStepInvalid) {
        this.currentStep.set(step.id);
        setTimeout(() => this.scrollToFirstError(), 100);
        return;
      }
    }
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
      ['title', 'company', 'description', 'startDate'].forEach(field => {
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
      const skillMasters = this.skillMasterList();
      
      const suggestedSkills = (skillMasters && Array.isArray(skillMasters)) 
        ? skillMasters.map(s => s.skillName) 
        : [];
        
      this.filteredSuggestions.set(t 
        ? suggestedSkills
            .filter(s => s.toLowerCase().includes(t))
            .sort()
            .slice(0, 5) 
        : []);
    });
  }

  selectSkillSuggestion(suggestion: string): void {
    const last = this.skillsControls.at(this.skillsControls.length - 1);
    if (last && last.get('name') && !last.get('name')?.value) {
        last.get('name')?.setValue(suggestion.trim());
    }
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
      techUsed: [''] // Added techUsed field
    });
  }
  addProject(): void { this.projectsControls.push(this.newProject()); }
  removeProject(index: number): void { this.projectsControls.removeAt(index); }

  // Helper function to format YYYY-MM (from input type="month") to YYYY-MM-01
  private formatDateForApi(monthYear: string | null): string | null {
      if (!monthYear) return null;
      return `${monthYear}-01`; 
  }

  private processSkillsAndProficiencies(cleanedSkills: any[]): Observable<any> {
    const skillAddRequests: Observable<any>[] = [];
    const proficiencyAddRequests: Observable<any>[] = [];
    
    // Process Skills (find unique skill names that are not in our master list)
    const skillsToProcess = Array.from(new Set(cleanedSkills.map((s: any) => s.name.trim().toLowerCase())));
    skillsToProcess.forEach(skillName => {
      const existingSkill = this.skillMasterList()?.find(sm => sm.skillName.toLowerCase() === skillName);
      if (!existingSkill) {
        skillAddRequests.push(
          this.resumeService.addSkill(skillName).pipe(
            tap(res => {
              this.skillMasterList.update(list => [...list, { id: res.skill_master_id, skillName: res.skill_name }]);
            }),
            catchError(err => of(null))
          )
        );
      }
    });

    // Process Proficiencies (find unique level names that are not in our proficiency list)
    const proficienciesToProcess = Array.from(new Set(cleanedSkills.map((s: any) => s.level.trim().toLowerCase())));
    proficienciesToProcess.forEach(levelName => {
      const existingProficiency = this.proficiencyList()?.find(pl => pl.levelName.toLowerCase() === levelName);
      if (!existingProficiency) {
        proficiencyAddRequests.push(
          this.resumeService.addProficiency(levelName).pipe(
            tap(res => {
              this.proficiencyList.update(list => [...list, { id: res.proficiency_id, levelName: res.level_name as ProficiencyLevel['levelName'] }]);
            }),
            catchError(err => of(null))
          )
        );
      }
    });

    if (skillAddRequests.length > 0 || proficiencyAddRequests.length > 0) {
      return forkJoin([...skillAddRequests, ...proficiencyAddRequests]);
    } else {
      return of(null); 
    }
  }

  private processProjectTechStack(cleanedProjects: any[]): Observable<any> {
    const techStackAddRequests: Observable<any>[] = [];
    const allTechNames: string[] = [];

    // Collect all unique tech names from projects
    cleanedProjects.forEach((p: any) => {
      if (p.techUsed) {
        p.techUsed.split(',').map((t: string) => t.trim().toLowerCase()).forEach((techName: string) => {
          if (techName && !allTechNames.includes(techName)) {
            allTechNames.push(techName);
          }
        });
      }
    });

    // Check and add new tech stacks
    allTechNames.forEach(techName => {
      const existingTechStack = this.skillMasterList()?.find(ts => ts.skillName.toLowerCase() === techName);
      if (!existingTechStack) {
        techStackAddRequests.push(
          this.resumeService.addTechStack(techName).pipe(
            tap(res => {
              this.skillMasterList.update(list => [...list, { id: res.tech_stack_id, skillName: res.tech_stack_name }]);
            }),
            catchError(err => of(null))
          )
        );
      }
    });

    if (techStackAddRequests.length > 0) {
      return forkJoin(techStackAddRequests);
    } else {
      return of(null); 
    }
  }

  // Submit
  onSubmit(): void {
    this.isSubmitted.set(true);
    this.resumeForm.markAllAsTouched();
    this.trimAllInputs();

    if (!this.resumeForm.valid) {
      this.findFirstInvalidStep();
      this.modalMessage.set('Please fill all mandatory fields to generate your resume.');
      return;
    }

    const userId = this.currentUserId();
    if (!userId) {
        this.modalMessage.set('Session ID is missing. Please log in again to submit the form.');
        console.error('Submission blocked: CURRENT_USER_ID is missing from session storage.');
        return;
    }
    
    const formValue = this.resumeForm.value;
    const cleanedData = {
      fullName: formValue.fullName,
      dob: formValue.dob,
      email: formValue.email,
      phone: formValue.phone,
      linkedin: formValue.linkedin,
      address: formValue.address,
      portfolio: formValue.portfolio,
      experienceType: formValue.experienceType,
      education: formValue.education.filter((e: any) => e.degree?.trim() !== ''),
      experience: formValue.experience.filter((e: any) => e.title?.trim() !== ''),
      skills: formValue.skills.filter((s: any) => s.name?.trim() !== '' && s.level?.trim() !== ''),
      projects: formValue.projects.filter((p: any) => p.title?.trim() !== '')
    };

    this.resumeForm.disable(); 
    this.modalMessage.set('Processing data and submitting to API...');

    // 1. Process and add any missing skills/proficiencies/tech stacks concurrently
    forkJoin([
        this.processSkillsAndProficiencies(cleanedData.skills),
        this.processProjectTechStack(cleanedData.projects)
    ]).pipe(
        // 2. Concatenate the main submission request
        concatMap(() => {
            const [firstName, ...lastNameParts] = cleanedData.fullName.trim().split(' ');
            const lastName = lastNameParts.join(' ') || cleanedData.fullName.trim(); 

            const extractUsername = (url: string) => {
              if (!url || typeof url !== 'string') return '';
              try {
                const urlObj = new URL(url);
                const pathSegments = urlObj.pathname.split('/').filter(p => p.length > 0);
                return pathSegments[pathSegments.length - 1] || '';
              } catch {
                return url; 
              }
            };


            const apiPayload = {
              userId: userId, 
              
              personalInfo: {
                firstName: firstName,
                lastName: lastName,
                dob: cleanedData.dob, 
                email: cleanedData.email,
                phone: cleanedData.phone,
                linkedinId: extractUsername(cleanedData.linkedin), 
                githubId: extractUsername(cleanedData.portfolio), 
              },
              
              education: cleanedData.education.map((edu: any) => ({
                qualification_type: edu.degree.includes('B.Tech') || edu.degree.includes('B.S') ? 'Bachelor' : (edu.degree.includes('M.') ? 'Master' : 'Certificate'), 
                qualification: edu.degree, 
                joined_on: this.formatDateForApi(edu.startDate)!,
                left_on: edu.isCurrent ? null : this.formatDateForApi(edu.endDate),
                marks: edu.grade,
                marking_system: edu.grade.toLowerCase().includes('cgpa') ? 'CGPA' : (edu.grade.includes('%') ? 'Percentage' : 'Marks'), 
                university: edu.institution
              })),
              
              experience: cleanedData.experience.map((exp: any) => ({
                position: exp.title,
                company: exp.company,
                joined_on: this.formatDateForApi(exp.startDate)!,
                left_on: exp.isCurrent ? null : this.formatDateForApi(exp.endDate),
                location: cleanedData.address.split(',').length > 0 ? cleanedData.address.split(',')[0].trim() : cleanedData.address, 
                worked_on: exp.description
              })),
              
              skills: cleanedData.skills.map((s: any) => {
                const masterSkill = this.skillMasterList()?.find(sm => sm.skillName.toLowerCase() === s.name.toLowerCase());
                const proficiency = this.proficiencyList()?.find(pl => pl.levelName.toLowerCase() === s.level.toLowerCase());
                
                return {
                  skillMasterId: masterSkill?.id || 0, 
                  proficiencyId: proficiency?.id || 0  
                };
              }).filter((s: any) => s.skillMasterId !== 0 && s.proficiencyId !== 0), 
              
              projects: cleanedData.projects.map((p: any) => ({
                projectName: p.title,
                githubLink: p.url || '',
                
                techStack: p.techUsed 
                    ? p.techUsed.split(',').map((t: string) => t.trim())
                      .map((tName: string) => {
                          const tech = this.skillMasterList()?.find(ts => ts.skillName.toLowerCase() === tName.toLowerCase());
                          return { tech_stackId: tech?.id || 0 };
                      })
                      .filter((ts: { tech_stackId: number }) => ts.tech_stackId !== 0) 
                    : [],
                    
                descriptions: p.description ? [{ description: p.description }] : [],
              }))
            };
            
            console.log('Final API Payload (After ID resolution):', apiPayload);
            return this.resumeService.submitResume(apiPayload);
        }),
        finalize(() => this.resumeForm.enable())
    ).subscribe({
      next: res => {
        const { message, username, password, role_id, user_id } = res;

        // Create the necessary mock data to ensure the ATS view works instantly
        const studentInfoForAts = {
            ...cleanedData,
            full_name: cleanedData.fullName,
            email: cleanedData.email,
            phone: cleanedData.phone,
            location: cleanedData.address,
            linkedin: cleanedData.linkedin,
            portfolio: cleanedData.portfolio,
            // Project data mapping for ATS View display
            projects: cleanedData.projects.map((p: any) => ({
                title: p.title,
                duration: p.duration,
                role: p.role,
                url: p.url,
                description: p.description,
                tech_used: p.techUsed
            })),
            // Skill data mapping for ATS View display
            skills: cleanedData.skills.map((s: any) => ({
                name: s.name,
                level: s.level
            })),
            // Education data mapping for ATS View display (extract only year part)
            education: cleanedData.education.map((e: any) => ({
                ...e,
                start_year: e.startDate.substring(0, 4),
                end_year: e.isCurrent ? 'Present' : e.endDate.substring(0, 4),
            }))
        };


        const mockLoginData = {
          message: message,
          username: username,
          password: password,
          role_id: role_id,
          info: studentInfoForAts 
        };
        
        if (typeof window !== 'undefined' && window.localStorage) { // FIX: Changed to localStorage
           // FIX: Persist data across browser sessions
           window.localStorage.setItem('STUDENT_DATA', JSON.stringify(mockLoginData));
           window.localStorage.setItem('cshub_profile_complete_once', 'true');
           window.localStorage.setItem('cshub_profile_prompt_dismissed', 'true');
        }
        

        this.modalMessage.set(
          `🎉 Resume data submitted successfully to API!\n\n` +
          `👤 User ID: ${user_id || userId}\n\nRedirecting to Dashboard...`
        );

        setTimeout(() => {
          // FIX: Redirect to the student dashboard page
          window.location.href = 'student-dashboard'; 
        }, 1500); 
      },
      error: (err: HttpErrorResponse) => {
        console.error('API Error Response:', err);
        const apiError = err.error?.error || err.statusText || JSON.stringify(err.error);
        this.modalMessage.set(
          `❌ Submission Failed (${err.status}):\n\n` +
          `Backend Error: ${apiError}\n\n` +
          `*Note: Check console for payload details.*`
        );
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