import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CreateJobService, Job, JobCreatePayload } from '../services/create-job.service';
@Component({
  selector: 'app-create-job',
  templateUrl: './create-job.component.html',
  styleUrls: ['../create-user/create-user.component.css'] // Reusing existing styles
})
export class CreateJobComponent implements OnInit {
  // Form Model
  jobData: JobCreatePayload = {
    jobtitle: '',
    job_type: 'Full-Time', 
    reqexp: 0,
    company: '',
    location: '',
    from_passed_out_year: new Date().getFullYear() - 5,
    to_passed_out_year: new Date().getFullYear(),
    hr_phone: '',
    hr_email: '',
    job_description: '',
    apply_before_date: this.getFutureDate(30), // Default to 30 days from now
    is_active: true
  };

  // Job Type Options for dropdown
  jobTypes = ['Full-Time', 'Part-Time', 'Contract', 'Internship'];

  // UI State
  message: string = '';
  isError: boolean = false;
  
  // Job List Panel properties
  isPanelOpen: boolean = false;
  allJobs: Job[] = [];
  filteredJobs: Job[] = []; // Currently not used for filtering, but kept for future expansion
  isLoadingJobs: boolean = false;
  
  // Custom Modal Properties (Not used for Job Delete/Deactivate, but included for completeness if needed later)
  // isModalOpen: boolean = false;
  // modalData: any | null = null; 

  constructor(
    private jobService: CreateJobService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initial data setup if needed
  }
  
  // Utility to generate a default future date string (YYYY-MM-DD)
  private getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // --- Job Creation Logic ---
  
  createJob(): void {
    if (!this.validateFormData()) {
      return;
    }

    this.jobService.createJob(this.jobData).subscribe({
      next: (response) => {
        this.showMessage(`Job "${this.jobData.jobtitle}" for ${this.jobData.company} successfully posted.`, false);
        // Clear form after successful submission (or reset to default)
        this.resetForm();
        // If the job panel is open, refresh the list
        if (this.isPanelOpen) {
          this.fetchJobs();
        }
      },
      error: (err) => {
        let errorMessage = 'An unknown error occurred during job posting.';
        
        if (err.status === 400 && err.error) {
            // Attempt to extract a specific error message from common fields or detail field
            errorMessage = err.error.jobtitle?.[0] || err.error.detail || 'Invalid data sent. Check console.';
        }
        
        this.showMessage(`Posting Failed: ${errorMessage}`, true);
        console.error('Job Posting Error:', err);
      }
    });
  }

  validateFormData(): boolean {
    if (!this.jobData.jobtitle || !this.jobData.company || !this.jobData.job_description) {
      this.showMessage('Error: Please fill in all required fields.', true);
      return false;
    }
    // Simple year validation
    if (this.jobData.from_passed_out_year > this.jobData.to_passed_out_year) {
        this.showMessage('Error: "From Passed Out Year" cannot be after "To Passed Out Year".', true);
        return false;
    }
    return true;
  }

  resetForm(): void {
    this.jobData = {
        jobtitle: '',
        job_type: 'Full-Time', 
        reqexp: 0,
        company: '',
        location: '',
        from_passed_out_year: new Date().getFullYear() - 5,
        to_passed_out_year: new Date().getFullYear(),
        hr_phone: '',
        hr_email: '',
        job_description: '',
        apply_before_date: this.getFutureDate(30), 
        is_active: true
    };
  }

  showMessage(text: string, error: boolean): void {
    this.message = text;
    this.isError = error;
    
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  goBack(): void {
    // Navigate back or to a main dashboard
    this.router.navigate(['/admin-panel']);
  }


  // --- Job List Panel Logic (Hamburger Menu) ---

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.fetchJobs();
    } else {
      this.allJobs = [];
      this.filteredJobs = [];
    }
  }

  fetchJobs(): void {
    this.isLoadingJobs = true;
    this.jobService.listJobs().subscribe({
      next: (data) => {
        this.allJobs = data; 
        this.filteredJobs = data; // Assign all fetched jobs to filtered list
        this.isLoadingJobs = false;
      },
      error: (err) => {
        this.showMessage('Failed to fetch job list. Check API connection.', true);
        this.isLoadingJobs = false;
        console.error('Fetch Jobs Error:', err);
      }
    });
  }

  // Utility to format date for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
