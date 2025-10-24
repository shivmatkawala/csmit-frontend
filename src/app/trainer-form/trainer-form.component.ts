import { Component, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courses: string[];
  experienceYears: number | null;
  imageUrl: string;
}

@Component({
  selector: 'app-trainer-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-form.component.html',
  styleUrls: ['./trainer-form.component.css']
})
export class TrainerFormComponent {

  trainers = signal<Trainer[]>([]);

  isTrainerListVisible = signal(false);
  currentTrainerId = signal<string | null>(null);
  selectedTrainerForActions = signal<Trainer | null>(null);
  isDeleteModalVisible = signal(false);
  trainerToDelete = signal<Trainer | null>(null);

  formTitle = computed(() =>
    this.currentTrainerId() ? 'Edit Trainer Details' : 'Create New Trainer'
  );

  newTrainer = signal<Trainer>({
      id: crypto.randomUUID(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      courses: [],
      experienceYears: null,
      imageUrl: 'https://placehold.co/80x80/2ecc71/ffffff?text=P',
  });

  ALL_COURSES: string[] = [
    'Python Programming', 'Data Science & Machine Learning', 'Frontend Development (Angular)',
    'Backend Development (Node.js/Express)', 'Cloud Computing (AWS/Azure/GCP)',
    'Cyber Security Fundamentals', 'Project Management (Agile/Scrum)',
    'Mobile App Development (Flutter)', 'UI/UX Design Principles', 'Database Administration (SQL/NoSQL)'
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

  constructor(private location: Location) {
    this.setupInitialData();
  }

  setupInitialData(): void {
    const mockTrainers: Trainer[] = [
      { id: '1', firstName: 'Priya', lastName: 'Singh', email: 'priya@mock.in', phone: '9000011111', courses: ['Data Science & Machine Learning', 'Python Programming'], experienceYears: 7, imageUrl: 'https://placehold.co/80x80/e74c3c/ffffff?text=PS' },
      { id: '2', firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@mock.in', phone: '9000022222', courses: ['Frontend Development (Angular)', 'UI/UX Design Principles'], experienceYears: 4, imageUrl: 'https://placehold.co/80x80/2980b9/ffffff?text=RK' },
      { id: '3', firstName: 'Sneha', lastName: 'Verma', email: 'sneha@mock.in', phone: '9000033333', courses: ['Cloud Computing (AWS/Azure/GCP)'], experienceYears: 9, imageUrl: 'https://placehold.co/80x80/f1c40f/333333?text=SV' },
    ];
    this.trainers.set(mockTrainers);
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
      return { ...trainer, courses: courses };
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

  onSubmit(form: NgForm): void {
    const trainerData = this.newTrainer();

    if (trainerData.courses.length === 0) {
      console.error("Validation Error: Please select at least one course.");
      return;
    }

    if (this.currentTrainerId()) {
      this.trainers.update(list =>
        list.map(t => t.id === this.currentTrainerId() ? trainerData : t)
      );
      console.log('Trainer Updated (Local Mock):', trainerData);
    } else {
      const newTrainer = { ...trainerData, id: crypto.randomUUID() };
      this.trainers.update(list => [newTrainer, ...list]);
      console.log('Trainer Created (Local Mock):', newTrainer);
    }

    this.resetForm(form);
    this.isTrainerListVisible.set(false);
  }

  loadTrainerForEdit(trainer: Trainer): void {
    this.newTrainer.set({ ...trainer });
    this.currentTrainerId.set(trainer.id);
    this.isTrainerListVisible.set(false);
    this.selectedTrainerForActions.set(null);
    document.querySelector('.form-card')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDeleteConfirm(trainer: Trainer): void {
    this.trainerToDelete.set(trainer);
    this.isDeleteModalVisible.set(true);
  }

  confirmDelete(): void {
    const trainer = this.trainerToDelete();
    if (trainer) {
        this.trainers.update(list => list.filter(t => t.id !== trainer.id));
        console.log('Trainer Permanently Deleted (Local Mock):', trainer.id);

        if (this.currentTrainerId() === trainer.id) {
            this.resetForm(null);
        }
    }
    this.isDeleteModalVisible.set(false);
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

    this.newTrainer.set({
      id: crypto.randomUUID(),
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      courses: [],
      experienceYears: null,
      imageUrl: 'https://placehold.co/80x80/2ecc71/ffffff?text=P',
    });
    this.courseFilter.set('');
  }

  goBack(): void {
    this.location.back();
  }

  toggleTrainerList(): void {
    this.isTrainerListVisible.update(visible => !visible);
    this.selectedTrainerForActions.set(null);
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
