import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Course {
  courseid: number; 
  coursename: string; 
}

export interface BatchDetail {
  batchId: number; 
  batchName: string; 
  course: Course; 
  is_active: boolean;
  startDate?: string; 
  timing?: string;     
  mode?: string;       
}

export interface CreateBatchPayload {
  batchName: string;
  courseId: number;
  start_date: string;
  timing: string;
  mode: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateBatchService {
  private http = inject(HttpClient);

  // ✅ FIXED: Hardcoded IP hata kar relative paths use kiye hain
  private readonly BATCH_BASE = '/api/batches';
  private readonly COURSE_BASE = '/api/courses';

  constructor() { }

  /**
   * URL: /api/courses/course-list/
   */
  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.COURSE_BASE}/course-list/`);
  }

  /**
   * URL: /api/batches/batches-by-course/{id}/
   */
  getBatchesByCourse(courseId: number): Observable<BatchDetail[]> {
    return this.http.get<BatchDetail[]>(`${this.BATCH_BASE}/batches-by-course/${courseId}/`);
  }

  /**
   * URL: /api/batches/batch-create/
   */
  createBatch(payload: CreateBatchPayload): Observable<any> {
    return this.http.post(`${this.BATCH_BASE}/batch-create/`, payload);
  }
  
  /**
   * URL: /api/batches/deactivate-batch/{id}/
   */
  deactivateBatch(batchId: number): Observable<any> {
    return this.http.patch(`${this.BATCH_BASE}/deactivate-batch/${batchId}/`, {}); 
  }

  /**
   * URL: /api/batches/reactivate-batch/{id}/
   */
  reactivateBatch(batchId: number): Observable<any> {
    return this.http.patch(`${this.BATCH_BASE}/reactivate-batch/${batchId}/`, {}); 
  }
}