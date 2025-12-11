import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

// Interface matching Django API response
export interface Job {
  id?: number; 
  title: string;
  department: string;
  type: string;
  location: string;
  experience: string;
  description: string;
  skills: string[]; // Backend should send/receive array
  posted_date?: string; // Django returns 'posted_date' (snake_case)
}

@Injectable({
  providedIn: 'root'
})
export class CareerService {
  private http = inject(HttpClient);
  
  // Point this to your Django API
  private apiUrl = 'http://localhost:8000/api/careers/jobs/'; 

  // BehaviorSubject to hold the current state of jobs
  private jobsSubject = new BehaviorSubject<Job[]>([]);
  public jobs$ = this.jobsSubject.asObservable();

  constructor() { }

  // 1. Fetch Jobs from Backend
  loadJobs() {
    this.http.get<Job[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.jobsSubject.next(data);
      },
      error: (error) => {
        console.error('Error fetching jobs:', error);
      }
    });
  }

  // 2. Add New Job to Backend
  addJob(job: Job): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, job).pipe(
      tap((newJob) => {
        // Optimistic update: Add to list immediately so user sees it without reload
        const currentJobs = this.jobsSubject.value;
        this.jobsSubject.next([newJob, ...currentJobs]);
      })
    );
  }

  // 3. Delete Job (Optional, for admin)
  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`).pipe(
      tap(() => {
        const updatedJobs = this.jobsSubject.value.filter(j => j.id !== id);
        this.jobsSubject.next(updatedJobs);
      })
    );
  }
}