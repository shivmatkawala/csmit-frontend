import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface to define the data structure for the job posting API payload
export interface JobCreatePayload {
    jobtitle: string;
    job_type: 'Full-Time' | 'Part-Time' | 'Contract' | 'Internship'; 
    reqexp: number; // Required Experience in years
    company: string;
    location: string;
    from_passed_out_year: number;
    to_passed_out_year: number;
    hr_phone: string;
    hr_email: string;
    job_description: string;
    apply_before_date: string; // ISO Date string (YYYY-MM-DD)
    is_active: boolean;
}

// Interface for the fetched job list
export interface Job {
    jobid: number; // Assuming the ID is a number, adjust if string
    jobtitle: string;
    company: string;
    location: string;
    job_type: string;
    reqexp: number;
    is_active: boolean;
    // Add other fields you might want to display here
}


@Injectable({
  providedIn: 'root'
})
export class CreateJobService {
  // Base URL for the job APIs
  private apiUrl = 'http://127.0.0.1:8000/api/jobs';
  private createJobEndpoint = `${this.apiUrl}/create-job/`; 
  private listJobsEndpoint = `${this.apiUrl}/list-jobs/`;


  constructor(private http: HttpClient) { }

  /**
   * Posts a new job vacancy to the backend.
   * @param jobData - The job details payload.
   * @returns Observable of the API response.
   */
  createJob(jobData: JobCreatePayload): Observable<any> {
    return this.http.post<any>(this.createJobEndpoint, jobData);
  }

  /**
   * Fetches the list of all posted jobs.
   * @returns Observable of an array of Job objects.
   */
  listJobs(): Observable<Job[]> {
    return this.http.get<Job[]>(this.listJobsEndpoint);
  }
}
