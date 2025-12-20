import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

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
  
  // ✅ FIXED: Hardcoded localhost hata diya hai taaki Proxy/Ngrok ke sath chale
  private apiUrl = '/api/careers/jobs/'; 

  private jobsSubject = new BehaviorSubject<Job[]>([]);
  public jobs$ = this.jobsSubject.asObservable();

  constructor() { }

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

  addJob(job: Job): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, job).pipe(
      tap((newJob) => {
        const currentJobs = this.jobsSubject.value;
        this.jobsSubject.next([newJob, ...currentJobs]);
      })
    );
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`).pipe(
      tap(() => {
        const updatedJobs = this.jobsSubject.value.filter(j => j.id !== id);
        this.jobsSubject.next(updatedJobs);
      })
    );
  }
}