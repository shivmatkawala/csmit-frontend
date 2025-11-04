import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AssignPayload, AssignUserToBatchService, User, BatchDetail, Course } from '../services/assign-user-to-batch.service';
import { HttpErrorResponse } from '@angular/common/http';

// User Interface ko update kiya gaya hai taki woh student ya trainer ka data rakh sake.
// Component-specific interface, assuming that the User service returns data that can be mapped to this.
export interface DetailedUser extends User {
  // NOTE: Assuming User interface uses 'id' but API returns 'userid' (based on user's query)
  role: 'student' | 'trainer' | 'admin'; // Role string
  roleid: number; // API se aane wala role ID (lowercase 'id' field name ke anusar update kiya gaya)
  details?: { [key: string]: any }; // User details ko key-value object ke roop mein define kiya
}

// forkJoin के लिए टाइप डेफिनिशन
type InitialData = { courses: Course[], users: User[] }; // User service se User[] aata hai

@Component({
  selector: 'app-assign-user-to-batch',
  templateUrl: './assign-user-to-batch.component.html',
})
export class AssignUserToBatchComponent implements OnInit {
  assignmentForm!: FormGroup;
  courses: Course[] = []; 
  batches: BatchDetail[] = []; 
  allUsers: DetailedUser[] = []; // Sabhi users jinka role set ho chuka hai
  
  filteredUsers: DetailedUser[] = []; // Select kiye gaye role ke anusar filter kiye gaye users
  selectedUserDetail: DetailedUser | null = null; 
  
  // UI States
  loading: boolean = true;
  message: string = '';
  isError: boolean = false;

  // Role Mappings (CreateUserComponent se liye gaye aur ab filtering ke liye use honge)
  private ROLE_ID_TRAINER = 2;
  private ROLE_ID_STUDENT = 3;
  private ROLE_ID_ADMIN = 1;

  constructor(
    private fb: FormBuilder,
    private assignService: AssignUserToBatchService 
  ) { }

  ngOnInit(): void {
    this.assignmentForm = this.fb.group({
      courseId: [null, Validators.required], 
      batchId: [{ value: null, disabled: true }, Validators.required],
      role: ['student', Validators.required], // Default role 'student'
      userId: [null, Validators.required],
    });

    this.loadInitialData();

    // 1. Role selection change hone par users ko filter karein
    this.assignmentForm.get('role')?.valueChanges.subscribe(role => {
      this.onRoleSelect(role as 'student' | 'trainer');
    });

    // 2. Course selection change hone par batches load karein
    this.assignmentForm.get('courseId')?.valueChanges.subscribe(courseId => {
      if (courseId !== null) {
        this.onCourseSelect(courseId);
      } else {
        this.batches = [];
        this.assignmentForm.get('batchId')?.disable();
        this.assignmentForm.get('batchId')?.setValue(null);
      }
    });

    // 3. User selection change hone par detail show karein
    this.assignmentForm.get('userId')?.valueChanges.subscribe(userId => {
        this.onUserSelect(userId);
    });
  }

  /**
   * Initial data (All Courses aur All Users) ko parallel fetching ke liye forkJoin ka upyog karke load karta hai.
   */
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
        
        // **FIXED: roleid (lowercase 'id') aur userid ka upyog**
        this.allUsers = (results.users || [])
        // Filter: Sirf users jinke pass userid aur roleid hai
        .filter((u: User) => (u as any).userid && (u as any).roleid !== undefined)
        .map((u: User) => {
          const rawUser = u as any;
          const userId = rawUser.userid || u.id;
          const apiRoleId: number = rawUser.roleid; // Corrected to use roleid
          
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
            id: userId, // Ensure the final object uses 'id' for consistency with form control
            role: userRole,
            roleid: apiRoleId, // Corrected to use roleid
            details: {
              id: userId,
              username: u.username,
              assignedRole: userRole,
              // Add other fields from u here if they exist
              ...(rawUser.is_active !== undefined) && { is_active: rawUser.is_active }
            }
          } as DetailedUser;
        })
        // Final Filter: Sirf 'student' (Role ID 3) और 'trainer' (Role ID 2) roles को ही UI में दिखाएँगे
        .filter((u: DetailedUser) => u.roleid === this.ROLE_ID_STUDENT || u.roleid === this.ROLE_ID_TRAINER); // Corrected to use roleid

        // Initial filtering for the default 'student' role
        this.onRoleSelect('student');

        if (this.courses.length === 0) {
          this.showMessage('No courses found. Cannot assign users to batches.', true);
        }
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.showMessage(`Error loading initial data. Details: ${err.message}`, true);
        console.error('Error loading initial data:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Role select hone par users ki list ko filter karta hai.
   */
  onRoleSelect(role: 'student' | 'trainer'): void {
    // allUsers mein se sirf selected role wale users ko filter karein
    this.filteredUsers = this.allUsers.filter(user => user.role === role);
    
    this.assignmentForm.get('userId')?.setValue(null);
    this.selectedUserDetail = null;
    
    if (this.filteredUsers.length === 0 && !this.loading) {
        this.showMessage(`No ${role} users found in the system.`, true);
    } else if (!this.loading) {
        this.showMessage(`Found ${this.filteredUsers.length} ${role} users.`, false);
    }
  }

  /**
   * User select hone par uss user ki detail ko set karta hai.
   */
  onUserSelect(userId: string | null): void {
    if (userId) {
        // Find user in the complete list
        this.selectedUserDetail = this.allUsers.find(user => user.id === userId) || null;
    } else {
        this.selectedUserDetail = null;
    }
  }

  /**
   * Course select hone par uss course ke batches fetch karta hai.
   */
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
          this.showMessage(`Batches loaded for Course ID ${courseId}.`, false);
        } else {
          this.showMessage(`No batches found for the selected course (ID: ${courseId}).`, true);
          this.assignmentForm.get('batchId')?.disable();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.showMessage(`Error fetching batches for course ID ${courseId}. Details: ${err.message}`, true);
        console.error('Batch Fetch Error:', err);
        this.loading = false;
      }
    });
  }

  /**
   * Form submit hone par user ko batch assign karta hai.
   */
  onSubmit(): void {
    const batchControl = this.assignmentForm.get('batchId');
    if (this.assignmentForm.invalid || !batchControl || batchControl.disabled) {
      this.assignmentForm.markAllAsTouched();
      this.showMessage('Please fill in all required fields and select an available batch.', true);
      return;
    }

    const formValue = this.assignmentForm.getRawValue();

    // API Payload
    const payload: AssignPayload = {
      batchId: formValue.batchId,
      userId: formValue.userId,
      role: formValue.role 
    };

    this.loading = true;
    this.message = 'Assigning user...';
    this.isError = false;

    this.assignService.assignUserToBatch(payload).subscribe({
      next: (response) => {
        this.showMessage('User successfully assigned to batch!', false);
        // Reset form, keeping courseId and role for quick re-assignment
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
        let errorMessage = 'Error assigning user to batch.';
        if (error.error && error.error.detail) {
          errorMessage = error.error.detail;
        } else if (error.message) {
          errorMessage = error.message;
        }
        this.showMessage(errorMessage, true);
        console.error('Assignment Error:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Message (Success/Error) ko display karta hai.
   */
  showMessage(messageText: string, isErrorFlag: boolean = false): void {
    this.message = messageText;
    this.isError = isErrorFlag;
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
