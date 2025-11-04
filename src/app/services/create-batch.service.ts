import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Defines the structure of course data fetched from the API (course-list/).
 */
export interface Course {
  courseid: number; // Matches API response
  coursename: string; // Matches API response
}

/**
 * Defines the structure of a single Batch returned by the API (batches-by-course/).
 * Uses 'batchId' which matches the JSON console snippet.
 */
export interface BatchDetail {
  batchId: number; // Unique ID for the batch (used for activate/deactivate). Matches API.
  batchName: string; // Batch name
  course: Course; // Nested course object (or course ID field)
  is_active: boolean; // Status flag for activate/deactivate
}

/**
 * Defines the data structure for the batch creation API payload (batch-create/).
 */
export interface CreateBatchPayload {
  batchName: string;
  courseId: number;
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

  /**
   * Fetches the list of all available courses.
   */
  getCourses(): Observable<Course[]> {
    console.log('Fetching courses from:', COURSE_LIST_API);
    return this.http.get<Course[]>(COURSE_LIST_API);
  }

  /**
   * Fetches batches for a specific course ID.
   */
  getBatchesByCourse(courseId: number): Observable<BatchDetail[]> {
    const apiUrl = `${BATCHES_BY_COURSE_API}${courseId}/`;
    console.log('Fetching batches from:', apiUrl);
    return this.http.get<BatchDetail[]>(apiUrl);
  }

  /**
   * Submits data to create a new batch.
   */
  createBatch(payload: CreateBatchPayload): Observable<any> {
    console.log('Creating new batch with payload:', payload);
    return this.http.post(BATCH_CREATE_API, payload);
  }
  
  /**
   * Deactivates a specific batch.
   */
  deactivateBatch(batchId: number): Observable<any> {
    const apiUrl = `${DEACTIVATE_BATCH_API}${batchId}/`;
    console.log('Deactivating batch:', apiUrl);
    return this.http.patch(apiUrl, {}); 
  }

  /**
   * Reactivates a specific batch.
   */
  reactivateBatch(batchId: number): Observable<any> {
    const apiUrl = `${REACTIVATE_BATCH_API}${batchId}/`;
    console.log('Reactivating batch:', apiUrl);
    return this.http.patch(apiUrl, {}); 
  }
}
