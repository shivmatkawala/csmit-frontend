import { Component, OnInit } from '@angular/core';
import { UserService } from '../services/user.service'; 
import { AlertService } from '../services/alert.service'; // Import AlertService
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.css']
})
export class CreateUserComponent implements OnInit {
  username: string = '';
  password?: string = '';
  roleid: number = 1; 

  roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Trainer' },
    { id: 3, name: 'Student' }
  ];
  
  // Removed local message variables as we are using AlertService
  
  // Flags for loading state and password visibility
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private userService: UserService, 
    private alertService: AlertService, // Inject AlertService
    private router: Router
  ) {}

  ngOnInit(): void {
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  
  createUser(): void {
    // Prevent multiple clicks
    if (this.isLoading) {
      return;
    }

    if (!this.username || !this.password || !this.roleid) {
      this.alertService.warning('Please enter all required fields (Email, Password, and Role).', 'Validation Error');
      return;
    }

    // Validation: Username should not contain only numbers
    if (/^\d+$/.test(this.username)) {
      this.alertService.warning('Username cannot consist only of numbers.', 'Validation Error');
      return;
    }

    const payload = {
        username: this.username,
        password: this.password,
        roleid: this.roleid
    };

    // Start loading state
    this.isLoading = true;

    this.userService.registerUser(payload).subscribe({
      next: (response) => {
        // Stop loading state
        this.isLoading = false;

        const roleName = this.roles.find(r => r.id === this.roleid)?.name;
        
        // Show Success Alert
        this.alertService.success(
            `User "${this.username}" successfully created and assigned role: ${roleName}`, 
            'User Created'
        );

        this.username = '';
        this.password = ''; 
        this.roleid = 1;
      },
      error: (err) => {
        // Stop loading state
        this.isLoading = false;

        let errorMessage = 'An unknown error occurred during registration.';
        let errorTitle = 'Registration Failed';
        
        // Handle specific error cases
        if (err.status === 409 || (err.error && typeof err.error.detail === 'string' && err.error.detail.toLowerCase().includes('exists'))) {
            errorMessage = 'User is already registered!';
            errorTitle = 'User Exists';
        } 
        else if (err.error && (
            (err.error.password && err.error.password.includes('incorrect')) || 
            (err.error.detail && err.error.detail.toLowerCase().includes('password'))
        )) {
            errorMessage = 'Password is incorrect';
        }
        else if (err.status === 400 && err.error) {
            errorMessage = err.error.username?.[0] || err.error.password?.[0] || err.error.roleid?.[0] || err.error.detail || `Invalid data sent.`;
        }
        
        // Show Error Alert
        this.alertService.error(errorMessage, errorTitle);
        console.error('Registration Error:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin-panel']); 
  }
}