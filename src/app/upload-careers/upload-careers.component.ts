import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-upload-career',
  templateUrl: './upload-careers.component.html',
  styleUrls: ['./upload-careers.component.css']
})
export class UploadCareerComponent {
  // Form Model
  jobData = {
    title: '',
    department: '', // Empty by default
    type: '',       // Empty by default
    location: '',
    experience: '',
    description: '',
    skills: '' 
  };

  // Pre-defined suggestions (User can type something else if they want)
  suggestedDepartments = ['Training', 'Administration', 'Marketing', 'Development', 'HR', 'Finance'];
  suggestedJobTypes = ['Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance'];
  
  isSubmitting = false;

  constructor(private http: HttpClient) {}

  submitJob() {
    this.isSubmitting = true;

    const payload = {
      ...this.jobData,
      skills: this.jobData.skills.split(',').map(s => s.trim())
    };

    const apiUrl = 'http://localhost:8000/api/careers/jobs/';

    this.http.post(apiUrl, payload).subscribe({
      next: (response) => {
        alert('Job Posted Successfully!');
        this.resetForm();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error posting job:', error);
        alert('Failed to post job. Please check if backend is running.');
        this.isSubmitting = false;
      }
    });
  }

  resetForm() {
    this.jobData = {
      title: '',
      department: '',
      type: '',
      location: '',
      experience: '',
      description: '',
      skills: ''
    };
  }
}