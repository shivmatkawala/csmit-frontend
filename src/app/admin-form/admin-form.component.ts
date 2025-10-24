import { Component, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

// Admin Data Interface
interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experienceYears: number | null;
  imageUrl: string;
}

@Component({
  selector: 'app-admin-form',
  standalone: true,
  imports: [CommonModule, FormsModule], // Required for Template-Driven Forms
  templateUrl: './admin-form.component.html',
  styleUrls: ['./admin-form.component.css']
})
export class AdminFormComponent {

  // State for the list of admins (for sidebar), initialized empty
  admins = signal<Admin[]>([]);

  // UI State Signals
  isAdminListVisible = signal(false);
  currentAdminId = signal<string | null>(null);
  selectedAdminForActions = signal<Admin | null>(null);
  isDeleteModalVisible = signal(false);
  adminToDelete = signal<Admin | null>(null);

  // Dynamic Form Title
  formTitle = computed(() =>
    this.currentAdminId() ? 'Edit Admin Details' : 'Create New Admin'
  );

  // Form Data Model, initialized to empty values
  newAdmin = signal<Admin>({
      id: crypto.randomUUID(),
      firstName: '', 
      lastName: '', 
      email: '', 
      phone: '', 
      experienceYears: null, 
      imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=A', // Default placeholder
  });

  // User ID (for mock database structure reference)
  userId: string = 'local-mock-user-id-001';

  constructor(private location: Location) {
    // Call a function to load mock data if needed, otherwise keep it empty
    // To enable mock data for testing, uncomment the line below.
    // this.loadInitialMockData(); 
  }

  // Isolation of Mock Data: This function can be deleted or replaced with an API call
  loadInitialMockData(): void {
    const mockAdmins: Admin[] = [
      { id: '1', firstName: 'Jane', lastName: 'Doe', email: 'jane.d@mock.in', phone: '9000011111', experienceYears: 10, imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=JD' },
      { id: '2', firstName: 'John', lastName: 'Smith', email: 'john.s@mock.in', phone: '9000022222', experienceYears: 6, imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=JS' },
    ];
    this.admins.set(mockAdmins);
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

  // Form Submission Handler
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      console.error('Validation Error: Form is invalid.');
      return;
    }
    
    // Get the current signal value
    const adminData = this.newAdmin();
    
    if (this.currentAdminId()) {
      // Logic for updating existing admin (Mock Update)
      this.admins.update(list =>
        list.map(t => t.id === this.currentAdminId() ? adminData : t)
      );
      console.log('Admin Updated (Local Mock):', adminData);
    } else {
      // Logic for creating new admin (Mock Create)
      const newAdmin = { ...adminData, id: crypto.randomUUID() };
      this.admins.update(list => [newAdmin, ...list]);
      console.log('Admin Created (Local Mock):', newAdmin);
    }

    this.resetForm(form);
    this.isAdminListVisible.set(false);
  }

  // Loads data into the form for editing
  loadAdminForEdit(admin: Admin): void {
    this.newAdmin.set({ ...admin });
    this.currentAdminId.set(admin.id);
    this.isAdminListVisible.set(false);
    this.selectedAdminForActions.set(null);
    document.querySelector('.form-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Delete flow methods (simplified for local mock)
  openDeleteConfirm(admin: Admin): void {
    this.adminToDelete.set(admin);
    this.isDeleteModalVisible.set(true);
  }

  confirmDelete(): void {
    const admin = this.adminToDelete();
    if (admin) {
        this.admins.update(list => list.filter(t => t.id !== admin.id));
        console.log('Admin Permanently Deleted (Local Mock):', admin.id);

        if (this.currentAdminId() === admin.id) {
            this.resetForm(null);
        }
    }
    this.isDeleteModalVisible.set(false);
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
      id: crypto.randomUUID(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      experienceYears: null,
      imageUrl: 'https://placehold.co/80x80/673AB7/ffffff?text=A',
    });
  }

  // Navigation and UI functions
  goBack(): void {
    this.location.back();
  }

  toggleAdminList(): void {
    this.isAdminListVisible.update(visible => !visible);
    this.selectedAdminForActions.set(null);
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
