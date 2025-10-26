import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Trainer, TrainerApiService } from '../services/trainer.service';

/**
 * Interface for the Course Data structure
 */
interface Course {
  courseName: string; // BatchName ki jagah CourseName
  courseCode: string;
  durationMonths: number | null; // Naya field
  selectedTrainerId: string; // Trainer ID store karne ke liye
  courseTiming: string; 
  capacity: number | null; // Max students
  price: number | null;
  isOnline: boolean;
  description: string;
}

@Component({
  selector: 'app-create-course',
  // Linking to separate template and style files
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css']
})
export class CreateCourseComponent implements OnInit {

  // State flags
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;
  errorMessage: string | null = null;
  
  // Trainer data
  trainers: Trainer[] = [];
  
  // Data model initialized with default values
  courseData: Course = {
    courseName: '',
    courseCode: '',
    durationMonths: 6,
    selectedTrainerId: '', // Default empty
    courseTiming: '2 Hours/Day',
    capacity: 40,
    price: 35000,
    isOnline: false,
    description: ''
  };

  constructor(private trainerApiService: TrainerApiService) { } // Inject Trainer Service

  ngOnInit(): void {
    this.fetchTrainers();
  }
  
  /**
   * Fetch all trainers from the API to populate the dropdown.
   */
  fetchTrainers(): void {
    // Calling the API service to get the list of trainers
    this.trainerApiService.getTrainers().subscribe({
      next: (data) => {
        this.trainers = data;
        // Optionally set a default trainer if available
        if (this.trainers.length > 0) {
          this.courseData.selectedTrainerId = this.trainers[0].id;
        }
      },
      error: (error) => {
        console.error('Error fetching trainers:', error);
        this.errorMessage = 'Failed to load trainers. Using mock data for selection.';
        // Fallback or mock data for demonstration if API fails (Optional)
        this.trainers = [
            { id: 'TRAINER-001', firstName: 'Mock', lastName: 'A', email: '', phone: '', courses: [], experienceYears: 5, imageUrl: '' },
            { id: 'TRAINER-002', firstName: 'Mock', lastName: 'B', email: '', phone: '', courses: [], experienceYears: 8, imageUrl: '' }
        ];
        if (this.trainers.length > 0) {
          this.courseData.selectedTrainerId = this.trainers[0].id;
        }
      }
    });
  }


  /**
   * Handles the form submission for the Template-Driven Form.
   * @param form The NgForm instance provided by Angular.
   */
  onSubmit(form: NgForm): void {
    this.errorMessage = null; // Clear previous errors
    if (form.invalid) {
      this.errorMessage = 'Form is invalid. Please fill in all required fields correctly.';
      console.error(this.errorMessage);
      this.formSubmitted = false;
      return;
    }

    this.isSubmitting = true;
    this.formSubmitted = false;
    
    // Find the selected trainer's name to display in console
    const selectedTrainer = this.trainers.find(t => t.id === this.courseData.selectedTrainerId);

    // Simulate API call delay for 1.5 seconds
    setTimeout(() => {
      // In a real application, you would send this.courseData to your backend service
      console.log('--- Course Data Successfully Submitted ---');
      console.log('Course Object:', this.courseData);
      console.log('Selected Trainer:', selectedTrainer ? `${selectedTrainer.firstName} ${selectedTrainer.lastName} (${selectedTrainer.id})` : 'N/A');
      
      this.isSubmitting = false;
      this.formSubmitted = true;

      // Optional: Reset form fields after successful submission
      // form.resetForm({
      //   courseTiming: '2 Hours/Day',
      //   isOnline: false,
      //   capacity: 40,
      //   price: 35000,
      //   durationMonths: 6,
      //   selectedTrainerId: this.trainers.length > 0 ? this.trainers[0].id : '',
      // });

    }, 1500); 
  }
  
  /**
   * Helper function to combine first name and last name
   * @param trainer The Trainer object
   * @returns Full name string
   */
  getTrainerFullName(trainer: Trainer): string {
    return `${trainer.firstName} ${trainer.lastName}`;
  }
}
