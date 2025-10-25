import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Trainer, TrainerApiService } from '../services/trainer.service';

@Component({
  selector: 'app-trainer-form',
  standalone: true,
  // HttpClientModule को imports में रखना आवश्यक है
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './trainer-form.component.html',
  styleUrls: ['./trainer-form.component.css'],
})
export class TrainerFormComponent implements OnInit {

  // Dependency Injection using inject() function 
  private location = inject(Location);
  private apiService = inject(TrainerApiService);
  
  // Data state
  trainers = signal<Trainer[]>([]); // List of all trainers fetched from API

  // UI state
  isTrainerListVisible = signal(false);
  currentTrainerId = signal<string | null>(null);
  selectedTrainerForActions = signal<Trainer | null>(null);
  isDeleteModalVisible = signal(false);
  trainerToDelete = signal<Trainer | null>(null);
  
  
  isLoading = signal(false);
  message = signal<{ type: 'success' | 'error' | null; text: string | null }>({ type: null, text: null });

  formTitle = computed(() =>
    this.currentTrainerId() ? 'Edit Trainer Details (ID: ' + this.currentTrainerId() + ')' : 'Create New Trainer'
  );

  newTrainer = signal<Trainer>({
      id: this.generateCsmitId(), 
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      courses: [],
      experienceYears: 0, // Default to 0
      imageUrl: 'https://placehold.co/80x80/2ecc71/ffffff?text=P',
  });

  ALL_COURSES: string[] = [
    'Python Programming', 'Data Science & Machine Learning', 'Frontend Development (Angular)',
    'Backend Development (Node.js/Express)', 'Cloud Computing (AWS/Azure/GCP)',
    'Cyber Security Fundamentals', 'Project Management (Agile/Scrum)',
    'Mobile App Development (Flutter)', 'UI/UX Design Principles', 'Database Administration (SQL/NoSQL)',
    'DevOps', 'Python', 'Docker', 'CI/CD' 
  ];

  courseFilter = signal('');

  filteredCourses = computed(() => {
    const filterText = this.courseFilter().toLowerCase().trim();
    if (filterText.length === 0) {
      return this.ALL_COURSES.slice(0, 5); 
    }

    return this.ALL_COURSES.filter(course =>
      course.toLowerCase().includes(filterText)
    );
  });
  
  userId: string = 'local-mock-user-id-001'; 

  constructor() {}


  ngOnInit(): void {
    // baad me comment htana hoga esko fetch krne ke liye
    // this.fetchTrainers(); 
  }
  
  /**
   * Generates a temporary CSMIT ID for new trainer forms.
   */
  private generateCsmitId(): string {
      // This is a placeholder for the required format (e.g., 'CSMIT-TRAINER-XXX')
      return `CSMIT-TRAINER-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
  }
  
  /**
   * Fetches all trainers from the API and updates the local signal. (Kept for optional future use)
   */
  private fetchTrainers(): void {
    this.isLoading.set(true);
    this.apiService.getTrainers().subscribe({
      next: (data) => {
        this.trainers.set(data);
        this.isLoading.set(false);
        this.clearMessage();
      },
      error: (err) => {
        console.error('API Error: Error fetching trainers', err);
        // Displaying error message related to the known 405 error
        this.message.set({ type: 'error', text: 'Error fetching trainers (API returned 405 Method Not Allowed). Submission functionality is separate.' });
        this.trainers.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Clears success/error messages after a delay.
   */
  private clearMessage(): void {
    setTimeout(() => {
      this.message.set({ type: null, text: null });
    }, 5000);
  }

  toggleCourseSelection(course: string): void {
    this.newTrainer.update(trainer => {
      const courses = trainer.courses;
      const index = courses.indexOf(course);

      if (index > -1) {
        courses.splice(index, 1);
      } else {
        courses.push(course);
      }
      return { ...trainer, courses: [...courses] };
    });
    this.courseFilter.set('');
  }

  handleImageUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        this.newTrainer.update(t => ({ ...t, imageUrl }));
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.newTrainer.update(t => ({ ...t, imageUrl: 'https://placehold.co/80x80/2ecc71/ffffff?text=P' }));
  }

  /**
   * Handles form submission (Create or Update) via the API service.
   * This uses the POST method for creation.
   */
  onSubmit(form: NgForm): void {
    const trainerData = this.newTrainer();

    if (trainerData.courses.length === 0) {
      this.message.set({ type: 'error', text: 'Validation Error: Please select at least one course.' });
      return;
    }
    
    // Set loading state
    this.isLoading.set(true);

    if (this.currentTrainerId()) {
      // EDIT / UPDATE (PUT)
      this.apiService.updateTrainer(trainerData).subscribe({
        next: () => {
          this.message.set({ type: 'success', text: `Trainer ${trainerData.id} updated successfully!` });
          // fetchTrainers() removed to avoid 405 error
          this.resetForm(form);
        },
        error: (err) => {
          console.error('API Error: Error updating trainer', err);
          this.message.set({ type: 'error', text: 'Update failed. Check console for API error.' });
          this.isLoading.set(false);
          this.clearMessage();
        }
      });
    } else {
      // CREATE (POST)
      const trainerToCreate: Trainer = { ...trainerData };

      this.apiService.createTrainer(trainerToCreate).subscribe({
        next: (response) => {
          // Assuming successful response might return the new ID/name
          const successId = response?.csmit_id || trainerToCreate.id;
          // Successfully submitted the form via POST
          this.message.set({ type: 'success', text: `New trainer created successfully with ID: ${successId}! Now check your backend DB to confirm.` });
          // fetchTrainers() removed to avoid 405 error
          this.resetForm(form);
        },
        error: (err) => {
          // Handle POST error here
          console.error('API Error: Error creating trainer', err);
          // 400 Bad Request or 500 Internal Server Error are common here.
          this.message.set({ type: 'error', text: 'Creation failed. Check console for API error (Likely validation error from backend).' });
          this.isLoading.set(false);
          this.clearMessage();
        }
      });
    }

    this.isTrainerListVisible.set(false);
  }

  loadTrainerForEdit(trainer: Trainer): void {
    this.newTrainer.set({ ...trainer });
    this.currentTrainerId.set(trainer.id);
    this.isTrainerListVisible.set(false);
    this.selectedTrainerForActions.set(null);
    this.clearMessage();
    document.querySelector('.form-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDeleteConfirm(trainer: Trainer): void {
    this.trainerToDelete.set(trainer);
    this.isDeleteModalVisible.set(true);
  }

  confirmDelete(): void {
    const trainer = this.trainerToDelete();
    this.isDeleteModalVisible.set(false);
    
    if (trainer) {
        this.isLoading.set(true);
        this.apiService.deleteTrainer(trainer.id).subscribe({
            next: () => {
                this.message.set({ type: 'success', text: `Trainer ${trainer.id} deleted successfully!` });
                // fetchTrainers() removed to avoid 405 error
                if (this.currentTrainerId() === trainer.id) {
                    this.resetForm(null);
                }
            },
            error: (err) => {
                console.error('API Error: Error deleting trainer', err);
                this.message.set({ type: 'error', text: 'Deletion failed. Check console for API error.' });
                this.isLoading.set(false);
                this.clearMessage();
            }
        });
    }
    this.trainerToDelete.set(null);
  }

  cancelDelete(): void {
    this.isDeleteModalVisible.set(false);
    this.trainerToDelete.set(null);
  }

  resetForm(form: NgForm | null): void {
    if (form) {
      form.resetForm();
    }

    this.currentTrainerId.set(null);

    // Reset to a clean state with a new temporary ID
    this.newTrainer.set({
      id: this.generateCsmitId(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      courses: [],
      experienceYears: 0,
      imageUrl: 'https://placehold.co/80x80/2ecc71/ffffff?text=P',
    });
    this.courseFilter.set('');
    this.clearMessage();
  }

  goBack(): void {
    this.location.back();
  }

  toggleTrainerList(): void {
    this.isTrainerListVisible.update(visible => !visible);
    this.selectedTrainerForActions.set(null);
    this.clearMessage();
  }

  toggleTrainerActions(trainer: Trainer): void {
    const currentSelected = this.selectedTrainerForActions();
    if (currentSelected && currentSelected.id === trainer.id) {
      this.selectedTrainerForActions.set(null);
    } else {
      this.selectedTrainerForActions.set(trainer);
    }
  }
}
