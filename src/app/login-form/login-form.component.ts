import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, LoginResponse } from '../services/api.service';
import { UserService } from '../services/user.service'; // ✅ Import UserService

@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
  // Login Models
  username: string = '';
  password: string = '';
  
  // Reset Password Models
  resetUserId: string = '';
  resetNewPassword: string = '';
  
  // UI States
  errorMessage: string = '';
  successMessage: string = '';
  hidePassword: boolean = true;
  hideResetPassword: boolean = true;
  isForgotPasswordMode: boolean = false; // ✅ Toggle State

  constructor(
    private api: ApiService, 
    private userService: UserService, // ✅ Inject UserService
    private router: Router
  ) {}

  // Toggle Password Visibility
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }
  
  toggleResetPasswordVisibility() {
    this.hideResetPassword = !this.hideResetPassword;
  }

  // Switch between Login and Forgot Password Forms
  toggleView() {
    this.isForgotPasswordMode = !this.isForgotPasswordMode;
    this.errorMessage = '';
    this.successMessage = '';
    // Reset fields
    this.username = '';
    this.password = '';
    this.resetUserId = '';
    this.resetNewPassword = '';
  }

  // LOGIN FUNCTIONALITY
  login() {
    this.errorMessage = '';
    this.successMessage = '';
    
    this.api.login(this.username, this.password).subscribe(
      (res: LoginResponse) => {
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
        this.errorMessage = error.error?.error || 'Login failed. Invalid credentials.';
      } 
    );
  }

  // ✅ FORGOT PASSWORD FUNCTIONALITY
  performPasswordReset() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.resetUserId || !this.resetNewPassword) {
      this.errorMessage = 'Please provide both User ID and New Password.';
      return;
    }

    this.userService.updatePassword(this.resetUserId, this.resetNewPassword).subscribe(
      (res) => {
        this.successMessage = 'Password updated successfully! Please login.';
        // Auto switch back to login after 2 seconds
        setTimeout(() => {
          this.toggleView();
        }, 2000);
      },
      (error) => {
        console.error('Reset Failed:', error);
        this.errorMessage = error.error?.error || 'Failed to update password. Check User ID.';
      }
    );
  }

  goBack() {
    this.router.navigate(['/landing-page']); 
  }
}