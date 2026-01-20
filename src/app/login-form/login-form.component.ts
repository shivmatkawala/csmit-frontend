import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
  // Login Models
  username: string = '';
  password: string = '';
  
  // Forgot Password Model
  forgotEmail: string = '';
  
  // UI States
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  hidePassword: boolean = true;
  
  // Toggle between Login and Forgot Password View
  isForgotPasswordMode: boolean = false;

  constructor(
    private api: ApiService, 
    private userService: UserService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  toggleView() {
    this.isForgotPasswordMode = !this.isForgotPasswordMode;
    // Clear states when switching views
    this.errorMessage = '';
    this.successMessage = '';
    this.forgotEmail = '';
    this.password = '';
    this.username = '';
  }

  login() {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;
    
    this.api.login(this.username, this.password).subscribe(
      (res: any) => { 
        this.isLoading = false;
        if (res.access) localStorage.setItem('access_token', res.access);
        if (res.refresh) localStorage.setItem('refresh_token', res.refresh);

        const authenticatedRole = res.role ? res.role.toUpperCase() : null; 

        if (!authenticatedRole) {
             this.errorMessage = 'Login failed. Role information missing.';
             return; 
        }
        
        console.log('Login successful:', authenticatedRole);
        
        if (authenticatedRole === 'ADMIN') { 
          this.router.navigate(['/admin-panel']);
        } 
        else if (authenticatedRole === 'TRAINER' || authenticatedRole === 'ITRAINER') { 
          this.router.navigate(['/trainer-dashboard']);
        } 
        else if (authenticatedRole === 'STUDENT') { 
          this.router.navigate(['/student-dashboard']);
        } else {
          this.errorMessage = `Role '${res.role}' is unrecognized.`;
        }
      },
      (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Login failed. Invalid credentials.';
      } 
    );
  }

  // ✅ New Logic: Send Request to Backend
  requestForgotPassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.forgotEmail) {
      this.errorMessage = 'Please enter your registered email address.';
      return;
    }
    
    // Simple email format check
    if (!this.forgotEmail.includes('@') || !this.forgotEmail.includes('.')) {
        this.errorMessage = 'Please enter a valid email address.';
        return;
    }

    this.isLoading = true;

    this.userService.forgotPassword(this.forgotEmail).subscribe(
      (res) => {
        this.isLoading = false;
        this.successMessage = 'Success! A temporary password has been sent to your Gmail.';
        // Optionally switch back to login after delay
        setTimeout(() => {
            this.isForgotPasswordMode = false;
            this.username = this.forgotEmail; // Auto-fill email for convenience
            this.forgotEmail = '';
            this.successMessage = 'Please login with the password sent to your email.';
        }, 3000);
      },
      (error) => {
        this.isLoading = false;
        console.error('Reset Failed:', error);
        this.errorMessage = error.error?.error || 'Could not reset password. Please verify your email.';
      }
    );
  }

  goBack() {
    this.router.navigate(['/landing-page']); 
  }
}