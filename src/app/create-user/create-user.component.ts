import { Component, OnInit } from '@angular/core';
import { UserService } from '../services/user.service'; 
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
  
  message: string = '';
  isError: boolean = false;


  constructor(
    private userService: UserService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    
  }

  
  
  createUser(): void {
    if (!this.username || !this.password || !this.roleid) {
      this.showMessage('Error: Please enter all required fields (Email, Password, and Role).', true);
      return;
    }

    const payload = {
        username: this.username,
        password: this.password,
        roleid: this.roleid
    };

    this.userService.registerUser(payload).subscribe({
      next: (response) => {
        const roleName = this.roles.find(r => r.id === this.roleid)?.name;
        this.showMessage(`User "${this.username}" successfully created and assigned role: ${roleName}`, false);
        this.username = '';
        this.password = ''; 
        this.roleid = 1;
        
      },
      error: (err) => {
        let errorMessage = 'An unknown error occurred during registration.';
        
        if (err.status === 400 && err.error) {
            errorMessage = err.error.username?.[0] || err.error.password?.[0] || err.error.roleid?.[0] || err.error.detail || `Invalid data sent. Check console for details.`;
        }
        
        this.showMessage(`Registration Failed: ${errorMessage}`, true);
        console.error('Registration Error:', err);
      }
    });
  }

  showMessage(text: string, error: boolean): void {
    this.message = text;
    this.isError = error;
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  goBack(): void {
    // यूज़र बनाने के बाद एडमिन डैशबोर्ड पर वापस जाएँ
    this.router.navigate(['/admin-panel']); 
  }

  // यूज़र मैनेजमेंट से संबंधित सभी सहायक फ़ंक्शन (togglePanel, fetchUsers, filterUsers, showConfirmation, आदि) हटा दिए गए हैं।
}