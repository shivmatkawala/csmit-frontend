import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role'); // We will ensure this is saved during login

    if (token && role) {
      // User is already logged in, redirect them to their respective dashboard immediately
      if (role === 'STUDENT') {
        this.router.navigate(['/student-dashboard']);
      } else if (role === 'TRAINER' || role === 'ITRAINER') {
        this.router.navigate(['/trainer-dashboard']);
      } else if (role === 'ADMIN') {
        this.router.navigate(['/admin-panel']);
      } else {
        // Fallback if role is unknown
        return true;
      }
      return false; // Prevent access to the requested route (landing/login)
    }

    // Not logged in, allow access to landing page or login page
    return true;
  }
}