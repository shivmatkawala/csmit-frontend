import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http'; // Required for API calls
import { Admin, AdminApiService } from '../../services/admin.service';
@Component({
  selector: 'app-admin-form',
  standalone: true,
  
  imports: [CommonModule, FormsModule, HttpClientModule], 
  templateUrl: './admin-form.component.html',
  styleUrls: ['./admin-form.component.css'],
})
export class AdminFormComponent implements OnInit {

  // Dependency Injection using inject() function 
  private location = inject(Location);
  private apiService = inject(AdminApiService); // Inject the new service
  
  // Data state
  admins = signal<Admin[]>([]); // List of all admins fetched from API

  // UI State Signals
  isAdminListVisible = signal(false);
  currentAdminId = signal<string | null>(null);
  selectedAdminForActions = signal<Admin | null>(null);
  isDeleteModalVisible = signal(false);
  adminToDelete = signal<Admin | null>(null);
  
  // API call state for loading/feedback
  isLoading = signal(false);
  message = signal<{ type: 'success' | 'error' | null; text: string | null }>({ type: null, text: null });

  // Dynamic Form Title
  formTitle = computed(() =>
    this.currentAdminId() ? 'Edit Admin Details (ID: ' + this.currentAdminId() + ')' : 'Create New Admin'
  );

  // Form Data Model, initialized to empty values
  newAdmin = signal<Admin>({
      id: this.generateCsmitId(), // Temporary ID for new entries
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      experienceYears: 0, 
      imageUrl: '', 
  });

  // User ID (for mock database structure reference)
  userId: string = 'local-mock-user-id-001';

  constructor() { }

  ngOnInit(): void {
    //this.fetchAdmins(); 
  }

  
  private generateCsmitId(): string {
      return `CSMIT-ADMIN-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
  }
  
  
  private clearMessage(): void {
    setTimeout(() => {
      this.message.set({ type: null, text: null });
    }, 5000);
  }
  private fetchAdmins(): void {
    this.isLoading.set(true);
    this.apiService.getAdmins().subscribe({
      next: (data) => {
        this.admins.set(data);
        this.isLoading.set(false);
        this.clearMessage();
      },
      error: (err) => {
        console.error('API Error: Error fetching admins', err);
        this.message.set({ type: 'error', text: 'Error fetching admins (API returned 405 Method Not Allowed).' });
        this.admins.set([]);
        this.isLoading.set(false);
      }
    });
  }


  // Handles image selection and converts it to a data URL for preview
  handleImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        this.newAdmin.update(t => ({ ...t, imageUrl }));
      };
      reader.readAsDataURL(file);
    }
  }

  // Resets the profile image to the default placeholder
  removeImage(): void {
    this.newAdmin.update(t => ({ ...t, imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=A' }));
  }

  // Form Submission Handler (Create or Update)
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      this.message.set({ type: 'error', text: 'Validation Error: Please fill all required fields correctly.' });
      return;
    }
    
    this.isLoading.set(true);
    const adminData = this.newAdmin();
    
    if (this.currentAdminId()) {
      // EDIT / UPDATE (PUT)
      this.apiService.updateAdmin(adminData).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: `Admin ${adminData.id} updated successfully!` });
          // this.fetchAdmins(); // Removed due to potential 405 GET error
          this.resetForm(form);
        },
        error: (err) => {
          console.error('API Error: Error updating admin', err);
          this.message.set({ type: 'error', text: 'Update failed. Check console for API error.' });
          this.isLoading.set(false);
          this.clearMessage();
        }
      });
    } else {
      // CREATE (POST)
      this.apiService.createAdmin(adminData).subscribe({
        next: (response) => {
          const successId = response?.csmit_id || adminData.id;
          this.message.set({ type: 'success', text: `New admin created successfully with ID: ${successId}! Now check your backend DB.` });
          // this.fetchAdmins(); // Removed due to potential 405 GET error
          this.resetForm(form);
        },
        error: (err) => {
          console.error('API Error: Error creating admin', err);
          this.message.set({ type: 'error', text: 'Creation failed. Check console for API error (Likely 400 Bad Request).' });
          this.isLoading.set(false);
          this.clearMessage();
        }
      });
    }

    this.isAdminListVisible.set(false);
  }
  loadAdminForEdit(admin: Admin): void {
    this.newAdmin.set({ ...admin });
    this.currentAdminId.set(admin.id);
    this.isAdminListVisible.set(false);
    this.selectedAdminForActions.set(null);
    this.clearMessage();
    document.querySelector('.form-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Delete flow methods 
  openDeleteConfirm(admin: Admin): void {
    this.adminToDelete.set(admin);
    this.isDeleteModalVisible.set(true);
  }

  confirmDelete(): void {
    const admin = this.adminToDelete();
    this.isDeleteModalVisible.set(false);
    
    if (admin) {
        this.isLoading.set(true);
        this.apiService.deleteAdmin(admin.id).subscribe({
            next: () => {
                this.message.set({ type: 'success', text: `Admin ${admin.id} deleted successfully!` });
                // this.fetchAdmins(); // Removed due to potential 405 GET error
                if (this.currentAdminId() === admin.id) {
                    this.resetForm(null);
                }
            },
            error: (err) => {
                console.error('API Error: Error deleting admin', err);
                this.message.set({ type: 'error', text: 'Deletion failed. Check console for API error.' });
                this.isLoading.set(false);
                this.clearMessage();
            }
        });
    }
    this.adminToDelete.set(null);
  }

  cancelDelete(): void {
    this.isDeleteModalVisible.set(false);
    this.adminToDelete.set(null);
  }

  // Resets the form and component state
  resetForm(form: NgForm | null): void {
    if (form) {
      form.resetForm();
    }

    this.currentAdminId.set(null);

    // Resetting newAdmin signal to default empty/placeholder values
    this.newAdmin.set({
      id: this.generateCsmitId(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      experienceYears: 0,
      imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=A',
    });
    this.isLoading.set(false);
    this.clearMessage();
  }

  // Navigation and UI functions
  goBack(): void {
    this.location.back();
  }

  toggleAdminList(): void {
    this.isAdminListVisible.update(visible => !visible);
    this.selectedAdminForActions.set(null);
    // अगर आप सूची देखना चाहते हैं और GET काम करता है, तो fetchAdmins को यहाँ कॉल करें।
    // if (this.isAdminListVisible()) { this.fetchAdmins(); } 
  }

  toggleAdminActions(admin: Admin): void {
    const currentSelected = this.selectedAdminForActions();
    if (currentSelected && currentSelected.id === admin.id) {
      this.selectedAdminForActions.set(null);
    } else {
      this.selectedAdminForActions.set(admin);
    }
  }
}
