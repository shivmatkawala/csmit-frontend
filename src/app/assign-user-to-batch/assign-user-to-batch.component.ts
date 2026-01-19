import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AssignPayload, AssignUserToBatchService, User, BatchDetail, Course } from '../services/assign-user-to-batch.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from '../services/alert.service';
import { Router } from '@angular/router'; // Import Router

export interface DetailedUser extends User {
  role: 'student' | 'trainer' | 'admin'; 
  roleid: number; 
  details?: { [key: string]: any }; 
}

type InitialData = { courses: Course[], users: User[] }; 

@Component({
  selector: 'app-assign-user-to-batch',
  templateUrl: './assign-user-to-batch.component.html',
  styleUrls: ['./assign-user-to-batch.component.css']
})
export class AssignUserToBatchComponent implements OnInit {
  assignmentForm!: FormGroup;
  courses: Course[] = []; 
  batches: BatchDetail[] = []; 
  allUsers: DetailedUser[] = []; 
  
  filteredUsers: DetailedUser[] = []; 
  selectedUserDetail: DetailedUser | null = null; 
  
  // UI States
  loading: boolean = true;

  private ROLE_ID_TRAINER = 2;
  private ROLE_ID_STUDENT = 3;

  constructor(
    private fb: FormBuilder,
    private assignService: AssignUserToBatchService,
    private alertService: AlertService,
    private router: Router // Inject Router
  ) { }

  ngOnInit(): void {
    this.assignmentForm = this.fb.group({
      courseId: [null, Validators.required], 
      batchId: [{ value: null, disabled: true }, Validators.required],
      role: ['student', Validators.required], 
      userId: [null, Validators.required],
    });

    this.loadInitialData();

    this.assignmentForm.get('role')?.valueChanges.subscribe(role => {
      this.onRoleSelect(role as 'student' | 'trainer');
    });

    this.assignmentForm.get('courseId')?.valueChanges.subscribe(courseId => {
      if (courseId !== null) {
        this.onCourseSelect(courseId);
      } else {
        this.batches = [];
        this.assignmentForm.get('batchId')?.disable();
        this.assignmentForm.get('batchId')?.setValue(null);
      }
    });

    this.assignmentForm.get('userId')?.valueChanges.subscribe(userId => {
        this.onUserSelect(userId);
    });
  }

  // Go Back Method
  goBack(): void {
    this.router.navigate(['/admin-panel']); 
  }

  loadInitialData(): void {
    this.loading = true;
    
    const courseObservable: Observable<Course[]> = this.assignService.getCourses();
    const usersObservable: Observable<User[]> = this.assignService.getUsers();

    forkJoin({
      courses: courseObservable,
      users: usersObservable
    }).subscribe({
      next: (results: InitialData) => { 
        this.courses = results.courses;
        
        this.allUsers = (results.users || [])
        .filter((u: User) => (u as any).userid && (u as any).roleid !== undefined)
        .map((u: User) => {
          const rawUser = u as any;
          const userId = rawUser.userid || u.id;
          const apiRoleId: number = rawUser.roleid; 
          
          let userRole: 'student' | 'trainer' | 'admin';
          
          if (apiRoleId === this.ROLE_ID_STUDENT) {
             userRole = 'student';
          } else if (apiRoleId === this.ROLE_ID_TRAINER) {
             userRole = 'trainer';
          } else {
             userRole = 'admin';
          }

          return {
            ...u,
            id: userId,
            role: userRole,
            roleid: apiRoleId, 
            details: {
              id: userId,
              username: u.username,
              assignedRole: userRole,
              ...(rawUser.is_active !== undefined) && { is_active: rawUser.is_active }
            }
          } as DetailedUser;
        })
        .filter((u: DetailedUser) => u.roleid === this.ROLE_ID_STUDENT || u.roleid === this.ROLE_ID_TRAINER); 

        this.onRoleSelect('student');

        if (this.courses.length === 0) {
          this.alertService.warning('No courses found. Cannot assign users to batches.');
        }
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.alertService.error(`Error loading initial data. Details: ${err.message}`);
        console.error('Error loading initial data:', err);
        this.loading = false;
      }
    });
  }

  onRoleSelect(role: 'student' | 'trainer'): void {
    this.filteredUsers = this.allUsers.filter(user => user.role === role);
    this.assignmentForm.get('userId')?.setValue(null);
    this.selectedUserDetail = null;
  }

  onUserSelect(userId: string | null): void {
    if (userId) {
        this.selectedUserDetail = this.allUsers.find(user => user.id === userId) || null;
    } else {
        this.selectedUserDetail = null;
    }
  }

  onCourseSelect(courseId: number): void {
    this.loading = true;
    this.batches = []; 
    this.assignmentForm.get('batchId')?.setValue(null);
    this.assignmentForm.get('batchId')?.disable();

    this.assignService.getBatchesByCourse(courseId).subscribe({
      next: (data: BatchDetail[]) => {
        this.batches = data;
        this.loading = false;
        
        if (this.batches.length > 0) {
          this.assignmentForm.get('batchId')?.enable();
        } else {
          this.alertService.info(`No batches found for the selected course (ID: ${courseId}).`);
          this.assignmentForm.get('batchId')?.disable();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.alertService.error(`Error fetching batches. Details: ${err.message}`);
        console.error('Batch Fetch Error:', err);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    const batchControl = this.assignmentForm.get('batchId');
    if (this.assignmentForm.invalid || !batchControl || batchControl.disabled) {
      this.assignmentForm.markAllAsTouched();
      this.alertService.warning('Please fill in all required fields and select an available batch.');
      return;
    }

    const formValue = this.assignmentForm.getRawValue();
    const currentRole = formValue.role; 

    const payload: AssignPayload = {
      batchId: formValue.batchId,
      userId: formValue.userId,
      role: currentRole 
    };

    this.loading = true;

    this.assignService.assignUserToBatch(payload).subscribe({
      next: (response) => {
        this.alertService.success(`User successfully assigned to batch as ${currentRole}!`);
        
        this.assignmentForm.reset({ 
          courseId: formValue.courseId,
          role: formValue.role 
        });
        this.batches = []; 
        this.assignmentForm.get('batchId')?.disable();
        this.selectedUserDetail = null; 
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        
        // --- CHECK FOR DUPLICATES (409 Conflict) ---
        if (
             error.status === 409 || 
             (error.error && error.error.detail && error.error.detail.toLowerCase().includes('already')) ||
             (error.message && error.message.toLowerCase().includes('already'))
           ) {
            // SHOW WARNING POPUP
            this.alertService.warning(
                `User is already assigned to this batch.`, 
                'Duplicate Assignment'
            );
            return;
        }

        let errorMessage = 'Error assigning user to batch.';
        if (error.error && error.error.detail) {
          errorMessage = error.error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.alertService.error(errorMessage);
        console.error('Assignment Error:', error);
      }
    });
  }
}