import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';

// Interface to define the structure of the job data
interface Job {
  companyName: string;
  jobRole: string;
  requiredSkills: string; // e.g., Comma-separated list of skills
  description: string;
}

@Component({
  selector: 'app-upload-job',
  templateUrl: './upload-job.component.html',
  styleUrls: ['./upload-job.component.css']
})
export class UploadJobComponent {
  // Initialize the model object with default values.
  // This object is bound to the form inputs using [(ngModel)].
  jobData: Job = {
    companyName: '',
    jobRole: '',
    requiredSkills: '',
    description: '',
  };

  // State variables for showing submission results
  isSubmitted: boolean = false;
  submittedJobData: Job | null = null;

  constructor() {}

  /**
   * Handles the form submission event.
   * @param form The NgForm instance provided by Angular's template-driven forms.
   */
  onSubmit(form: NgForm): void {
    if (form.valid) {
      // Log the data for demonstration purposes
      console.log('Job Data Submitted:', this.jobData);

      // In a real application, this is where you would call a service
      // to save the data to a backend (like Firestore or an API).

      // Set state to display the submitted data
      this.submittedJobData = { ...this.jobData };
      this.isSubmitted = true;
      
    } else {
      console.error('Form is invalid. Please check all required fields.');
      // Programmatically mark all controls as touched to show validation messages
      form.control.markAllAsTouched();
    }
  }

  /**
   * Resets the form state and the model data.
   * @param form The NgForm instance.
   */
  resetForm(form: NgForm): void {
    // Clear the model object
    this.jobData = {
      companyName: '',
      jobRole: '',
      requiredSkills: '',
      description: '',
    };
    // Use NgForm's reset method to clear the template state
    form.resetForm(this.jobData);
    this.isSubmitted = false;
    this.submittedJobData = null;
  }
}
