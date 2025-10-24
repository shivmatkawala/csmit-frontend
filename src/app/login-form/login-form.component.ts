import { Component } from '@angular/core';
import { Router } from '@angular/router';
// ApiService se Student interface ki ab zaroorat nahi hai kyonki data ko tap operator mein save kiya ja raha hai
import { ApiService } from '../services/api.service'; 


@Component({
  selector: 'app-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent {
  username: string = '';
  password: string = '';
  role: string = '';

  constructor(private api: ApiService, private router: Router) {}

  login() {
    // API service mein ab 'tap' operator se data automatically save ho jayega agar login successful hua
    this.api.login(this.username, this.password, this.role).subscribe(
      (res: any) => {
        // alert(res.message); // Removed this line to prevent the pop-up
        
        // Navigate based on role (State save hone ke baad navigation)
        if (this.role === 'Admin') this.router.navigate(['/admin-panel']);
        else if (this.role === 'Trainer') this.router.navigate(['/trainer-dashboard']);
        else this.router.navigate(['/student-dashboard']); // Student Dashboard par navigate
      },
      // Error messages will still show a pop-up, you should also change this 
      // to a custom modal later for a better user experience.
      err => alert(err.error.error) 
    );
  }

  // New functionality: To go back to the previous page
  goBack() {
    // Assuming '/' is the landing page path
    this.router.navigate(['/landing-page']); 
  }
}
