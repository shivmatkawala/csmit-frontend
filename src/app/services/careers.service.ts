import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, switchMap, map } from 'rxjs';

// TODO: Production ke liye is variable ko environment.ts me move karein
// import { environment } from 'src/environments/environment';
// const API_BASE_URL = environment.apiUrl; 
const API_BASE_URL = 'http://localhost:8000/api'; 

// Interface matching Django API response
export interface Job {
  id?: number; 
  title: string;
  department: string;
  type: string;
  location: string;
  experience: string;
  description: string;
  skills: string[];
  posted_date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CareerService {
  private http = inject(HttpClient);
  
  // Dynamic API URLs (Centralized)
  private jobsUrl = `${API_BASE_URL}/careers/jobs/`; 
  private applyUrl = `${API_BASE_URL}/job-applications/submit/`;

  // BehaviorSubject to hold the current state of jobs
  private jobsSubject = new BehaviorSubject<Job[]>([]);
  public jobs$ = this.jobsSubject.asObservable();

  constructor() { }

  // --- EXISTING FUNCTIONALITY (Jobs List) ---

  loadJobs() {
    this.http.get<Job[]>(this.jobsUrl).subscribe({
      next: (data) => {
        this.jobsSubject.next(data);
      },
      error: (error) => {
        console.error('Error fetching jobs:', error);
      }
    });
  }

  addJob(job: Job): Observable<Job> {
    return this.http.post<Job>(this.jobsUrl, job).pipe(
      tap((newJob) => {
        const currentJobs = this.jobsSubject.value;
        this.jobsSubject.next([newJob, ...currentJobs]);
      })
    );
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.jobsUrl}${id}/`).pipe(
      tap(() => {
        const updatedJobs = this.jobsSubject.value.filter(j => j.id !== id);
        this.jobsSubject.next(updatedJobs);
      })
    );
  }

  // --- NEW FUNCTIONALITY (Real-time Application) ---

  submitApplication(formData: any, resumeFile: File): Observable<any> {
    // Step 1: Send Form Data to Backend to get S3 Presigned URL
    return this.http.post<any>(this.applyUrl, formData).pipe(
      switchMap((response) => {
        const uploadUrl = response.upload_url;
        
        if (!uploadUrl) {
          throw new Error('Upload URL not received from server');
        }

        // Step 2: Upload File directly to S3
        // Note: We deliberately remove Authorization header for S3 request if interceptors exist
        // headers: new HttpHeaders({ 'Content-Type': 'application/pdf', 'Skip-Interceptor': 'true' })
        
        return this.http.put(uploadUrl, resumeFile, {
          headers: new HttpHeaders({ 
            'Content-Type': resumeFile.type || 'application/pdf' 
          })
        }).pipe(
          // Return the original success response (contains application_id)
          map(() => response)
        );
      })
    );
  }
}