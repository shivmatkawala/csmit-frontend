import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, LoginResponse } from '../services/api.service'; // LoginResponse ko import karein


@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = ''; // Error message display karne ke liye

  constructor(private api: ApiService, private router: Router) {}

  login() {
    this.errorMessage = ''; // Har baar login attempt par error clear karein
    
    // API ko sirf username aur password bhejte hain
    this.api.login(this.username, this.password).subscribe(
      (res: LoginResponse) => {
        
        // FIX: Server se aaya hua role string (e.g., "Admin", "Trainer", "Student") use karenge.
        const authenticatedRole = res.role ? res.role.toUpperCase() : null; 

        if (!authenticatedRole) {
             // Agar server role nahi bhejta hai (API Contract fail), to error message dikhayenge
             this.errorMessage = 'Login failed. Role information (string) missing from server response.';
             return; 
        }
        
        // User ID store karein (Server response mein agar 'csmit_id' ya koi anya ID ho)
        if (res.csmit_id && typeof window !== 'undefined' && window.sessionStorage) {
             window.sessionStorage.setItem('CURRENT_USER_ID', res.csmit_id); 
             console.log('User ID stored as CURRENT_USER_ID:', res.csmit_id);
        }

        // Navigation logic based STRICTLY on the authenticated role string from the server
        if (authenticatedRole === 'ADMIN') { 
          this.router.navigate(['/admin-panel']);
        } else if (authenticatedRole === 'TRAINER') { 
          this.router.navigate(['/trainer-dashboard']);
        } else if (authenticatedRole === 'STUDENT') { 
          this.router.navigate(['/student-dashboard']);
        } else {
          this.errorMessage = `Login successful, but role '${res.role}' is unrecognized. Contact support.`;
        }

      },
      (error) => {
        // Handle error: Server ने invalid credentials या अन्य error भेजा है
        this.errorMessage = error.message || 'Login failed. Invalid credentials or API error.';
        console.error('Login Failed:', error);
      } 
    );
  }

  // New functionality: To go back to the previous page
  goBack() {
    // Assuming '/' is the landing page path
    this.router.navigate(['/landing-page']); 
  }
}
