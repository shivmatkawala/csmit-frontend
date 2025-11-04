import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../services/user.service'; 
import { Router } from '@angular/router';

// Interface for the custom confirmation modal data
interface ConfirmationData {
    message: string;
    userId: string; // This holds the user's ID string (e.g., USR001)
    action: 'deactivate' | 'reactivate' | 'delete';
}

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

  // User Management Panel properties
  isPanelOpen: boolean = false;
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  currentFilter: number | null = null; 
  isLoadingUsers: boolean = false;
  
  // Custom Modal Properties
  isModalOpen: boolean = false;
  modalData: ConfirmationData | null = null;


  constructor(
    private userService: UserService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Component initialization logic
  }

  // --- User Creation Logic ---
  
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
        if (this.isPanelOpen) {
          this.fetchUsers();
        }
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
    this.router.navigate(['/admin-panel']);
  }


  // --- User Management Panel Logic ---

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.fetchUsers();
    } else {
      this.allUsers = [];
      this.filteredUsers = [];
      this.currentFilter = null;
    }
  }

  fetchUsers(): void {
    this.isLoadingUsers = true;
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        // Data is assigned directly, assuming it matches the User[] interface
        this.allUsers = data; 
        this.filterUsers(this.currentFilter); 
        this.isLoadingUsers = false;
      },
      error: (err) => {
        this.showMessage('Failed to fetch user list. Check API connection.', true);
        this.isLoadingUsers = false;
        console.error('Fetch Users Error:', err);
      }
    });
  }

  filterUsers(roleId: number | null): void {
    this.currentFilter = roleId;
    if (roleId === null) {
      this.filteredUsers = this.allUsers;
    } else {
      this.filteredUsers = this.allUsers.filter(user => user.roleid === roleId);
    }
  }

  getRoleName(roleId: number): string {
    return this.roles.find(r => r.id === roleId)?.name || 'Unknown Role';
  }
  
  // --- Action Handlers (Deactivate, Reactivate, Delete) ---

  // Shows the custom confirmation modal
  showConfirmation(userId: string, action: 'deactivate' | 'reactivate' | 'delete'): void {
    let message = '';
    if (action === 'deactivate') {
      message = `Are you sure you want to DEACTIVATE user ${userId}? The user will not be able to log in.`;
    } else if (action === 'reactivate') {
      message = `Are you sure you want to REACTIVATE user ${userId}? The user will regain access.`;
    } else if (action === 'delete') {
      message = `Are you sure you want to DELETE user ${userId} permanently? This action cannot be undone.`;
    }

    this.modalData = { message, userId, action };
    this.isModalOpen = true;
  }
  
  // Closes the custom modal
  closeModal(): void {
    this.isModalOpen = false;
    this.modalData = null;
  }

  // Executes the confirmed action
  confirmAction(): void {
    if (!this.modalData) return;
    
    const { userId, action } = this.modalData;
    this.closeModal();

    if (action === 'deactivate') {
        this.deactivateUser(userId);
    } else if (action === 'reactivate') {
        this.reactivateUser(userId);
    } else if (action === 'delete') {
        this.deleteUser(userId);
    }
  }

  deactivateUser(userId: string): void {
    this.userService.deactivateUser(userId).subscribe({
      next: () => {
        this.showMessage(`User ${userId} successfully deactivated.`, false);
        this.fetchUsers(); 
      },
      error: (err) => {
        this.showMessage(`Failed to deactivate user ${userId}.`, true);
        console.error('Deactivate User Error:', err);
      }
    });
  }

  reactivateUser(userId: string): void {
    this.userService.reactivateUser(userId).subscribe({
        next: () => {
            this.showMessage(`User ${userId} successfully reactivated.`, false);
            this.fetchUsers(); 
        },
        error: (err) => {
            this.showMessage(`Failed to reactivate user ${userId}.`, true);
            console.error('Reactivate User Error:', err);
        }
    });
  }

  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.showMessage(`User ${userId} successfully deleted.`, false);
        this.fetchUsers(); 
      },
      error: (err) => {
        this.showMessage(`Failed to delete user ${userId}.`, true);
        console.error('Delete User Error:', err);
      }
    });
  }
}
