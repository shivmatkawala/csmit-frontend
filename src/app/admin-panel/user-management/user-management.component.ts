import { Component, OnInit, ChangeDetectionStrategy, signal, Input } from '@angular/core';
import { User, UserService } from 'src/app/services/user.service';
// Interface for the custom confirmation modal data
interface ConfirmationData {
    message: string;
    userId: string; 
    action: 'deactivate' | 'reactivate' | 'delete';
}

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent implements OnInit {

  // Role definitions for filtering and display
  roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Trainer' },
    { id: 3, name: 'Student' }
  ];

  allUsers: User[] = [];
  filteredUsers: User[] = [];
  currentFilter = signal<number | null>(null); // Current role filter (1, 2, 3 or null for All)
  isLoadingUsers = signal<boolean>(false);
  
  // Search properties - now received via Input from AdminPanel
  @Input() globalSearchQuery: string = ''; // Global search query from the header
  
  // Custom Modal Properties
  isModalOpen = signal<boolean>(false);
  modalData = signal<ConfirmationData | null>(null);
  
  // Custom Message Box for the User Tab
  userTabMessage = signal<{text: string, isError: boolean} | null>(null);


  constructor(
      private userService: UserService 
  ) { }

  ngOnInit(): void {
    // Search terms subscription logic is removed as it's now handled by the parent component (AdminPanel)
    this.fetchUsers();
  }
  
  /**
   * Public method to manually trigger filtering when the external search changes.
   * This is called by the AdminPanelComponent after a debounced search term update.
   */
  triggerExternalSearch(): void {
      this.applyFilterAndSearch();
  }

  /**
   * Combines role filter and search query to update filteredUsers.
   */
  applyFilterAndSearch(): void {
    const roleId = this.currentFilter();
    // Use the external query from Input
    const query = this.globalSearchQuery.toLowerCase().trim();

    let tempUsers = this.allUsers;

    // 1. Apply Role Filter
    if (roleId !== null) {
      tempUsers = tempUsers.filter(user => user.roleid === roleId);
    }

    // 2. Apply Search Filter (by username/email ID ONLY)
    if (query) {
      this.filteredUsers = tempUsers.filter(user => 
        // Searching by Gmail ID (which is assumed to be the user.username property)
        user.username.toLowerCase().includes(query)
      );
    } else {
      this.filteredUsers = tempUsers;
    }
  }

  // --- User Management Logic ---

  /**
   * Shows a custom notification message on the user management page.
   * @param text The message content.
   * @param error True if it's an error message.
   */
  showUserMessage(text: string, error: boolean): void {
    this.userTabMessage.set({text: text, isError: error});
    
    setTimeout(() => {
      this.userTabMessage.set(null);
    }, 5000);
  }

  /**
   * Fetches all users from the backend API.
   */
  fetchUsers(): void {
    if (this.isLoadingUsers()) return; 
    this.isLoadingUsers.set(true);
    
    this.userService.getAllUsers().subscribe({
      next: (data) => {
        this.allUsers = data; 
        this.applyFilterAndSearch(); // Apply filter and search on new data
        this.isLoadingUsers.set(false);
      },
      error: (err) => {
        this.showUserMessage('Failed to fetch user list. Check API connection.', true);
        this.isLoadingUsers.set(false);
        console.error('Fetch Users Error:', err);
      }
    });
  }

  /**
   * Filters the user list based on the selected role ID (and re-applies search).
   * @param roleId The ID of the role to filter by (or null for all).
   */
  filterUsers(roleId: number | null): void {
    this.currentFilter.set(roleId);
    this.applyFilterAndSearch();
  }

  /**
   * Gets the role name from the role ID.
   * @param roleId The role ID.
   * @returns The corresponding role name.
   */
  getRoleName(roleId: number): string {
    return this.roles.find(r => r.id === roleId)?.name || 'Unknown Role';
  }
  
  // --- Modal and Action Handlers (Kept the same) ---

  /**
   * Shows the custom confirmation modal for an action.
   * @param userId The ID of the user to act on.
   * @param action The action type ('deactivate' | 'reactivate' | 'delete').
   */
  showConfirmation(userId: string, action: 'deactivate' | 'reactivate' | 'delete'): void {
    const user = this.allUsers.find(u => u.userid === userId);
    const username = user ? user.username : userId;

    let message = '';
    if (action === 'deactivate') {
      message = `Are you sure you want to DEACTIVATE user ${username} (${userId})? The user will not be able to log in.`;
    } else if (action === 'reactivate') {
      message = `Are you sure you want to REACTIVATE user ${username} (${userId})? The user will regain access.`;
    } else if (action === 'delete') {
      message = `Are you sure you want to DELETE user ${username} (${userId}) permanently? This action cannot be undone.`;
    }

    this.modalData.set({ message, userId, action });
    this.isModalOpen.set(true);
  }
  
  /**
   * Closes the custom confirmation modal.
   */
  closeModal(): void {
    this.isModalOpen.set(false);
    this.modalData.set(null);
  }

  /**
   * Executes the confirmed action after modal confirmation.
   */
  confirmAction(): void {
    const data = this.modalData();
    if (!data) return;
    
    const { userId, action } = data;
    this.closeModal();

    if (action === 'deactivate') {
        this.deactivateUser(userId);
    } else if (action === 'reactivate') {
        this.reactivateUser(userId);
    } else if (action === 'delete') {
        this.deleteUser(userId);
    }
  }

  /**
   * Calls the service to deactivate a user.
   * @param userId The user ID.
   */
  deactivateUser(userId: string): void {
    this.userService.deactivateUser(userId).subscribe({
      next: () => {
        this.showUserMessage(`User ${userId} successfully deactivated.`, false);
        this.fetchUsers(); 
      },
      error: (err) => {
        this.showUserMessage(`Failed to deactivate user ${userId}.`, true);
        console.error('Deactivate User Error:', err);
      }
    });
  }

  /**
   * Calls the service to reactivate a user.
   * @param userId The user ID.
   */
  reactivateUser(userId: string): void {
    this.userService.reactivateUser(userId).subscribe({
        next: () => {
            this.showUserMessage(`User ${userId} successfully reactivated.`, false);
            this.fetchUsers(); 
        },
        error: (err) => {
            this.showUserMessage(`Failed to reactivate user ${userId}.`, true);
            console.error('Reactivate User Error:', err);
        }
    });
  }

  /**
   * Calls the service to delete a user.
   * @param userId The user ID.
   */
  deleteUser(userId: string): void {
    this.userService.deleteUser(userId).subscribe({
      next: () => {
        this.showUserMessage(`User ${userId} successfully deleted.`, false);
        this.fetchUsers(); 
      },
      error: (err) => {
        this.showUserMessage(`Failed to delete user ${userId}.`, true);
        console.error('Delete User Error:', err);
      }
    });
  }
}