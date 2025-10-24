import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';

/**
 * Interface for the Batch Data structure
 */
interface Batch {
  batchName: string;
  course: string;
  startDate: string;
  // Replaced 'endDate' with 'batchTiming'
  batchTiming: string; 
  capacity: number | null;
  price: number | null;
  isOnline: boolean;
  description: string;
}

@Component({
  selector: 'app-create-batch',
  // Linking to separate template and style files
  templateUrl: './create-batch.component.html',
  styleUrls: ['./create-batch.component.css']
})
export class CreateBatchComponent implements OnInit {

  // State flags
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;

  // List of available courses for the dropdown
  courses: string[] = [
    'Web Development (MERN/MEAN)',
    'Data Science & ML',
    'Cloud Computing (AWS/Azure)',
    'Cyber Security',
    'DevOps Engineering',
    'UI/UX Design'
  ];

  // Data model initialized with default values
  batchData: Batch = {
    batchName: '',
    course: '',
    startDate: '',
    batchTiming: '10:00 AM - 12:00 PM', // New field
    capacity: 25,
    price: 15000,
    isOnline: false,
    description: ''
  };

  ngOnInit(): void {
    // Set default start date on initialization
    this.batchData.startDate = this.getTodayDate();
    // Removed default setting for endDate
  }

  /**
   * Helper function to get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Removed getFutureDate as it is no longer needed

  /**
   * Handles the form submission for the Template-Driven Form.
   * @param form The NgForm instance provided by Angular.
   */
  onSubmit(form: NgForm): void {
    if (form.invalid) {
      console.error('Form is invalid. Please fill in all required fields.');
      this.formSubmitted = false;
      return;
    }

    this.isSubmitting = true;
    this.formSubmitted = false;

    // Simulate API call delay for 1.5 seconds
    setTimeout(() => {
      // In a real application, you would send this.batchData to your backend service (e.g., Firestore)
      console.log('--- Batch Data Successfully Submitted ---');
      console.log('Batch Object:', this.batchData);
      
      this.isSubmitting = false;
      this.formSubmitted = true;

      // Optional: Reset form fields after successful submission
      // form.resetForm({
      //   startDate: this.getTodayDate(),
      //   batchTiming: '10:00 AM - 12:00 PM',
      //   isOnline: false,
      //   capacity: 25,
      //   price: 15000,
      // });

    }, 1500); 
  }
}
