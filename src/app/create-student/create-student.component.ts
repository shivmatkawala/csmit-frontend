import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, FormControl } from '@angular/forms';
import { Observable, Subject, forkJoin, of } from 'rxjs'; 
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
  
  // FIX: State to hold fetched setup data from API
  skillMasterList = signal<SkillMaster[]>([]);
  proficiencyList = signal<ProficiencyLevel[]>([]);

  resumeForm: FormGroup = this.fb.group({
    fullName: ['', Validators.required],
    dob: ['', Validators.required], 
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
    linkedin: ['', Validators.required],
    address: ['', Validators.required],
    portfolio: [''],

    education: this.fb.array([this.newEducation()], Validators.required),
    experienceType: ['Fresher', Validators.required],
    experience: this.fb.array([]),
    // Ensure one initial skill group is always present, but allow it to be empty if user removes it later.
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
    // FIX: Calling fetchSetupData on initialization
    this.fetchSetupData(); 
    this.setupExperienceTypeSubscription();
    this.setupSkillSearchSubscription();
  }
  
  loadSessionData(): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      // NOTE: Using a hardcoded ID for testing based on your provided JSON
      const defaultUserId = 'USR006'; 
      const userId = window.sessionStorage.getItem('CURRENT_USER_ID') || defaultUserId;
      this.currentUserId.set(userId);
      window.sessionStorage.setItem('CURRENT_USER_ID', userId); // Ensure it's set if using default
      
      if (!userId) {
        console.warn('CURRENT_USER_ID not found in session storage. Using form data for submission.');
      } else {
        console.log('User ID loaded/set in session:', userId);
      }
    }
  }

  // FIX: Updated logic to correctly combine skills and techStacks for the skillMasterList
  fetchSetupData(): void {
      this.resumeService.getSetupData().subscribe({
          next: (data: SetupData) => {
              const allSkillsMap = new Map<number, SkillMaster>();

              // 1. Process standard skills
              if (data.skills && Array.isArray(data.skills)) {
                  data.skills.forEach(skill => {
                      allSkillsMap.set(skill.skillmasterid, { id: skill.skillmasterid, skillName: skill.skillname });
                  });
              }
              
              // 2. Process tech stacks (Tech stack items might overlap with skills, so we use a Map for uniqueness)
              if (data.techStacks && Array.isArray(data.techStacks)) {
                  data.techStacks.forEach(tech => {
                      // Use tech_stack_id as id and techname as skillName
                      if (!allSkillsMap.has(tech.tech_stackid)) {
                          allSkillsMap.set(tech.tech_stackid, { id: tech.tech_stackid, skillName: tech.techname });
                      }
                  });
              }

              this.skillMasterList.set(Array.from(allSkillsMap.values()));
              
              if (data.proficiencies && Array.isArray(data.proficiencies)) {
                // Map proficiency data to the expected ProficiencyLevel structure
                const mappedProficiencies = data.proficiencies.map(p => ({
                    id: p.proficiencyid,
                    // Ensure levelName is treated as string for dropdown display
                    levelName: p.levelname as ProficiencyLevel['levelName']
                }));
                this.proficiencyList.set(mappedProficiencies);
              } else {
                this.proficiencyList.set([]); // Fallback to empty array
              }
              
              console.log('Setup Data fetched successfully (Total Skills/TechStacks:', this.skillMasterList().length, ', Proficiencies:', this.proficiencyList().length, ')');
          },
          error: (err: HttpErrorResponse) => {
              console.error('Failed to fetch setup data from API (Skills/Proficiency):', err);
              this.modalMessage.set(`❌ Setup Data Fetch Failed (${err.status}): Could not load Skills and Proficiency levels from API.`);
              // Ensure signals are set to empty arrays on failure to prevent map errors
              this.skillMasterList.set([]); 
              this.proficiencyList.set([]);
              // Mock data fallback for UI testing (remove in production)
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
    if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private findFirstInvalidStep(): void {
    for (const step of this.steps) {
      const controlsToCheck = this.stepControlsMap[step.id as keyof typeof this.stepControlsMap] || [];
      let isStepInvalid = false;

      for (const controlName of controlsToCheck) {
        const control = this.resumeForm.get(controlName);

        if (control instanceof FormArray) {
          // Check if an array is empty when required (like education) or has invalid items
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

  // FIX: Updated logic to use skillMasterList (which includes tech stacks) for suggestions
  setupSkillSearchSubscription(): void {
    this.skillSearchControl.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(term => {
      const t = (term || '').toLowerCase();
      const skillMasters = this.skillMasterList();
      
      // Combine all skill names for suggestion
      const suggestedSkills = (skillMasters && Array.isArray(skillMasters)) 
        ? skillMasters.map(s => s.skillName) 
        : [];
        
      this.filteredSuggestions.set(t ? suggestedSkills.filter(s => s.toLowerCase().includes(t)).slice(0, 5) : []);
    });
  }

  selectSkillSuggestion(suggestion: string): void {
    // Try to fill the last skill entry if empty
    const last = this.skillsControls.at(this.skillsControls.length - 1);
    if (last && !last.get('name')?.value) last.get('name')?.setValue(suggestion.trim());
    else {
      // Otherwise, add a new skill entry and set the value
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

  // --- New Helper for dynamic adding of skills/proficiencies/techstack ---
  private processSkillsAndProficiencies(cleanedSkills: any[]): Observable<any> {
    const skillAddRequests: Observable<any>[] = [];
    const proficiencyAddRequests: Observable<any>[] = [];
    
    // Process Skills (find unique skill names that are not in our master list)
    const skillsToProcess = Array.from(new Set(cleanedSkills.map((s: any) => s.name.toLowerCase())));
    skillsToProcess.forEach(skillName => {
      const existingSkill = this.skillMasterList()?.find(sm => sm.skillName.toLowerCase() === skillName);
      if (!existingSkill) {
        skillAddRequests.push(
          this.resumeService.addSkill(skillName).pipe(
            tap(res => {
              // Add new skill to our local list for immediate use
              this.skillMasterList.update(list => [...list, { id: res.skill_master_id, skillName: res.skill_name }]);
              console.log(`Added new skill: ${res.skill_name} with ID: ${res.skill_master_id}`);
            }),
            catchError(err => {
              console.error(`Failed to add new skill '${skillName}':`, err);
              return of(null); 
            })
          )
        );
      }
    });

    // Process Proficiencies (find unique level names that are not in our proficiency list)
    const proficienciesToProcess = Array.from(new Set(cleanedSkills.map((s: any) => s.level.toLowerCase())));
    proficienciesToProcess.forEach(levelName => {
      const existingProficiency = this.proficiencyList()?.find(pl => pl.levelName.toLowerCase() === levelName);
      if (!existingProficiency) {
        proficiencyAddRequests.push(
          this.resumeService.addProficiency(levelName).pipe(
            tap(res => {
              // Add new proficiency to our local list for immediate use
              this.proficiencyList.update(list => [...list, { id: res.proficiency_id, levelName: res.level_name as ProficiencyLevel['levelName'] }]);
              console.log(`Added new proficiency: ${res.level_name} with ID: ${res.proficiency_id}`);
            }),
            catchError(err => {
              console.error(`Failed to add new proficiency '${levelName}':`, err);
              return of(null);
            })
          )
        );
      }
    });

    // Combine all add requests
    if (skillAddRequests.length > 0 || proficiencyAddRequests.length > 0) {
      return forkJoin([...skillAddRequests, ...proficiencyAddRequests]);
    } else {
      return of(null); // No new skills/proficiencies to add
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

    // Check and add new tech stacks (Tech stack uses skillMasterList since it's a type of skill)
    allTechNames.forEach(techName => {
      const existingTechStack = this.skillMasterList()?.find(ts => ts.skillName.toLowerCase() === techName);
      if (!existingTechStack) {
        techStackAddRequests.push(
          this.resumeService.addTechStack(techName).pipe(
            tap(res => {
              // Add new tech stack to our local skillMasterList
              // Assuming API response has tech_stack_id and tech_stack_name
              this.skillMasterList.update(list => [...list, { id: res.tech_stack_id, skillName: res.tech_stack_name }]);
              console.log(`Added new tech stack: ${res.tech_stack_name} with ID: ${res.tech_stack_id}`);
            }),
            catchError(err => {
              console.error(`Failed to add new tech stack '${techName}':`, err);
              return of(null);
            })
          )
        );
      }
    });

    if (techStackAddRequests.length > 0) {
      return forkJoin(techStackAddRequests);
    } else {
      return of(null); // No new tech stacks to add
    }
  }
  // --- End New Helper ---

  // Submit
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

    if (!this.currentUserId()) {
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
      // Only include skills that have both name and level
      skills: formValue.skills.filter((s: any) => s.name?.trim() !== '' && s.level?.trim() !== ''),
      projects: formValue.projects.filter((p: any) => p.title?.trim() !== '')
    };

    this.resumeForm.disable(); // Disable form while processing/submitting

    // FIX: Start by processing skills/proficiencies/tech stacks and adding missing ones to the backend.
    forkJoin([
        this.processSkillsAndProficiencies(cleanedData.skills),
        this.processProjectTechStack(cleanedData.projects)
    ]).pipe(
        concatMap(() => {
            // After all missing setup data is processed, proceed to build the final API payload
            // using the UPDATED local skillMasterList and proficiencyList.

            const [firstName, ...lastNameParts] = cleanedData.fullName.trim().split(' ');
            const lastName = lastNameParts.join(' ') || cleanedData.fullName.trim(); 

            // Helper to extract ID from URL end, handling empty or invalid URLs gracefully
            const extractIdFromUrl = (url: string, platform: 'linkedin' | 'github') => {
              if (!url || typeof url !== 'string') return '';
              const parts = url.split('/').filter(p => p.trim() !== '');
              const lastPart = parts.pop();
              
              if (platform === 'linkedin') {
                // If the link is like linkedin.com/in/shivkumar-reddy, return shivkumar-reddy
                return lastPart || '';
              } else if (platform === 'github') {
                // If the link is like github.com/shivkumar/repo, we want 'shivkumar' if no repo is provided, or the last part if it looks like a username
                if (parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'github.com') {
                    // This is probably just the username
                    return lastPart || '';
                }
                // Default to last part if it seems like a username/repo name
                return lastPart || '';
              }
              return '';
            };


            const apiPayload = {
              // FIX: Use currentUserId which is guaranteed to be set to USR006 or session value
              userId: this.currentUserId()!, 
              
              personalInfo: {
                firstName: firstName,
                lastName: lastName,
                dob: cleanedData.dob, 
                email: cleanedData.email,
                phone: cleanedData.phone,
                linkedinId: extractIdFromUrl(cleanedData.linkedin, 'linkedin'),
                githubId: extractIdFromUrl(cleanedData.portfolio, 'github'),
              },
              
              education: cleanedData.education.map((edu: any) => ({
                qualification_type: 'Bachelor', // Assuming 'Bachelor' or adjust based on degree name
                qualification: edu.degree, 
                joined_on: this.formatDateForApi(edu.startDate)!,
                left_on: edu.isCurrent ? null : this.formatDateForApi(edu.endDate),
                marks: edu.grade,
                // Simple logic for marking system based on the string content
                marking_system: edu.grade.toLowerCase().includes('cgpa') ? 'CGPA' : (edu.grade.includes('%') ? 'Percentage' : 'Marks'), 
                university: edu.institution
              })),
              
              experience: cleanedData.experience.map((exp: any) => ({
                position: exp.title,
                company: exp.company,
                joined_on: this.formatDateForApi(exp.startDate)!,
                left_on: exp.isCurrent ? null : this.formatDateForApi(exp.endDate),
                location: cleanedData.address.split(',')[0].trim(), // Taking only the City for location field
                worked_on: exp.description
              })),
              
              // Map skills to their IDs using the up-to-date local lists
              skills: cleanedData.skills.map((s: any) => {
                const masterSkill = this.skillMasterList()?.find(sm => sm.skillName.toLowerCase() === s.name.toLowerCase());
                const proficiency = this.proficiencyList()?.find(pl => pl.levelName.toLowerCase() === s.level.toLowerCase());
                
                return {
                  skillMasterId: masterSkill?.id || 0, 
                  proficiencyId: proficiency?.id || 0  
                };
              }).filter((s: any) => s.skillMasterId !== 0 && s.proficiencyId !== 0), 
              
              // Map project details to the required nested structure
              projects: cleanedData.projects.map((p: any) => ({
                projectName: p.title,
                githubLink: p.url || '',
                
                // Tech Stack: Get IDs for all comma-separated tech names
                techStack: p.techUsed 
                    ? p.techUsed.split(',').map((t: string) => t.trim())
                      .map((tName: string) => {
                          const tech = this.skillMasterList()?.find(ts => ts.skillName.toLowerCase() === tName.toLowerCase());
                          return { tech_stackId: tech?.id || 0 };
                      })
                      .filter((ts: { tech_stackId: number }) => ts.tech_stackId !== 0) 
                    : [],
                    
                // Descriptions: Create the array of description objects
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

        const mockLoginData = {
          message: message,
          username: username,
          password: password,
          role_id: role_id,
          info: cleanedData 
        };
        
        if (typeof window !== 'undefined' && window.sessionStorage) {
           window.sessionStorage.setItem('STUDENT_DATA', JSON.stringify(mockLoginData));
           window.sessionStorage.setItem('CURRENT_USER_ID', user_id); 
        }
        

        this.modalMessage.set(
          `🎉 Resume data submitted successfully to API!\n\n` +
          `👤 User ID: ${user_id}\n\nRedirecting to preview...`
        );

        setTimeout(() => {
          // window.location.href = 'generate-ats-resume'; // Disabled for canvas testing
        }, 1500); 
      },
      error: (err: HttpErrorResponse) => {
        console.error('API Error Response:', err);
        const apiError = err.error?.error || err.statusText;
        this.modalMessage.set(
          `❌ Submission Failed (${err.status}):\n\n` +
          `Backend Error: ${apiError}\n\n` +
          `*Note: The error 'User not found or inactive' usually means the API is trying to look up the submitted 'userId' in the database and failing. Ensure the user is created/active in the DB.*`
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
