import { Injectable } from '@angular/core';
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
}

export interface CreateBatchPayload {
  batchName: string;
  courseId: number;
}

// ✅ FIXED: Hardcoded IP hata kar relative paths set kiye hain
const BATCHES_BASE = '/api/batches/';
const COURSE_LIST_API = '/api/courses/course-list/';

const BATCH_CREATE_API = BATCHES_BASE + 'batch-create/';
const BATCHES_BY_COURSE_API = BATCHES_BASE + 'batches-by-course/'; 
const DEACTIVATE_BATCH_API = BATCHES_BASE + 'deactivate-batch/'; 
const REACTIVATE_BATCH_API = BATCHES_BASE + 'reactivate-batch/'; 

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