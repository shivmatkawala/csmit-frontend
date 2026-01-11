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
}

export interface User {
  id: string;
  username: string;
}

export interface AssignPayload {
  batchId: number;
  userId: string;
  role: 'student' | 'trainer';
}

@Injectable({
  providedIn: 'root'
})
export class AssignUserToBatchService {

  private http = inject(HttpClient);

  // ✅ FIXED: Hardcoded 'http://127.0.0.1:8000' hata diya hai
  private readonly BASE_URL = '/api'; 

  constructor() { }

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.BASE_URL}/courses/course-list/`);
  }

 
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.BASE_URL}/users/all/`);
  }
  getBatchesByCourse(courseId: number): Observable<BatchDetail[]> {
    const url = `${this.BASE_URL}/batches/batches-by-course/${courseId}/`;
    return this.http.get<BatchDetail[]>(url); 
  }
  assignUserToBatch(payload: AssignPayload): Observable<any> {
    return this.http.post(`${this.BASE_URL}/batches/assign-user-to-batch/`, payload);
  }
}