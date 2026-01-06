import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CreateJobService, Job, JobCreatePayload } from '../services/create-job.service';
import { AlertService } from '../services/alert.service'; // Import AlertService

@Component({
  selector: 'app-create-job',
  templateUrl: './create-job.component.html',
  styleUrls: ['./create-job.component.css'] // Using the new dedicated CSS file
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
  // Removed local message/isError as we use AlertService now
  
  // Job List Panel properties
  isPanelOpen: boolean = false;
  allJobs: Job[] = [];
  filteredJobs: Job[] = []; 
  isLoadingJobs: boolean = false;
  
  constructor(
    private jobService: CreateJobService, 
    private router: Router,
    private alertService: AlertService // Inject AlertService
  ) {}

  ngOnInit(): void {
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
        this.alertService.success(`Job "${this.jobData.jobtitle}" for ${this.jobData.company} successfully posted.`);
        
        // Clear form after successful submission
        this.resetForm();
        
        // If the job panel is open, refresh the list
        if (this.isPanelOpen) {
          this.fetchJobs();
        }
      },
      error: (err) => {
        let errorMessage = 'An unknown error occurred during job posting.';
        
        if (err.status === 400 && err.error) {
            errorMessage = err.error.jobtitle?.[0] || err.error.detail || 'Invalid data sent. Check console.';
        }
        
        this.alertService.error(`Posting Failed: ${errorMessage}`);
        console.error('Job Posting Error:', err);
      }
    });
  }

  validateFormData(): boolean {
    if (!this.jobData.jobtitle || !this.jobData.company || !this.jobData.job_description) {
      this.alertService.warning('Please fill in all required fields (Title, Company, Description).');
      return false;
    }
    // Simple year validation
    if (this.jobData.from_passed_out_year > this.jobData.to_passed_out_year) {
        this.alertService.warning('"From Passed Out Year" cannot be after "To Passed Out Year".');
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

  goBack(): void {
    this.router.navigate(['/admin-panel']);
  }

  // --- Job List Panel Logic (Hamburger Menu) ---

  togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.fetchJobs();
    } else {
      // Optional: clear list on close if you want to force refresh on open
      // this.allJobs = [];
      // this.filteredJobs = [];
    }
  }

  fetchJobs(): void {
    this.isLoadingJobs = true;
    this.jobService.listJobs().subscribe({
      next: (data) => {
        this.allJobs = data; 
        this.filteredJobs = data; 
        this.isLoadingJobs = false;
        
        if (data.length === 0) {
            // Optional: minimal feedback if list is empty
            // this.alertService.info('No active jobs found.');
        }
      },
      error: (err) => {
        this.alertService.error('Failed to fetch job list. Check API connection.');
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