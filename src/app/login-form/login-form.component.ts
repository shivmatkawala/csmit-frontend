import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
    this.api.login(this.username, this.password, this.role).subscribe(
      (res: any) => {
        // alert(res.message); // Removed this line to prevent the pop-up
        
        // Navigate based on role
        if (this.role === 'Admin') this.router.navigate(['/admin-panel']);
        else if (this.role === 'Trainer') this.router.navigate(['/trainer-dashboard']);
        else this.router.navigate(['/student-dashboard']);
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
