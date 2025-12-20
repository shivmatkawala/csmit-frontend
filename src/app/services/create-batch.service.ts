import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Defines the structure of course data fetched from the API.
 */
export interface Course {
  courseid: number; 
  coursename: string; 
}

/**
 * Updated BatchDetail to include real fields from Backend
 */
export interface BatchDetail {
  batchId: number; 
  batchName: string; 
  course: Course; 
  is_active: boolean;
  
  // New Fields (Matches what Django sends in GET)
  startDate?: string; 
  timing?: string;     
  mode?: string;       
}

/**
 * Updated Payload to send new fields to Backend
 */
export interface CreateBatchPayload {
  batchName: string;
  courseId: number;
  start_date: string;  // Backend expects 'start_date'
  timing: string;
  mode: string;
}

// API Endpoints
const BASE_URL = 'http://127.0.0.1:8000/api/batches/';
const COURSE_LIST_API = 'http://127.0.0.1:8000/api/courses/course-list/';
const BATCH_CREATE_API = BASE_URL + 'batch-create/';
const BATCHES_BY_COURSE_API = BASE_URL + 'batches-by-course/'; 
const DEACTIVATE_BATCH_API = BASE_URL + 'deactivate-batch/'; 
const REACTIVATE_BATCH_API = BASE_URL + 'reactivate-batch/'; 

@Injectable({
  providedIn: 'root'
})
export class CreateBatchService {

  constructor(private http: HttpClient) { }

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(COURSE_LIST_API);
  }

  getBatchesByCourse(courseId: number): Observable<BatchDetail[]> {
    const apiUrl = `${BATCHES_BY_COURSE_API}${courseId}/`;
    return this.http.get<BatchDetail[]>(apiUrl);
  }

  createBatch(payload: CreateBatchPayload): Observable<any> {
    return this.http.post(BATCH_CREATE_API, payload);
  }
  
  deactivateBatch(batchId: number): Observable<any> {
    const apiUrl = `${DEACTIVATE_BATCH_API}${batchId}/`;
    return this.http.patch(apiUrl, {}); 
  }

  reactivateBatch(batchId: number): Observable<any> {
    const apiUrl = `${REACTIVATE_BATCH_API}${batchId}/`;
    return this.http.patch(apiUrl, {}); 
  }
}