import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class examAPi {
  private baseUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) {}

  fetchCourses(): Observable<any> {
    // API: http://127.0.0.1:8000/api/courses/course-list/
    return this.http.get(`${this.baseUrl}courses/course-list/`);
  }

  fetchBatches(courseId: number): Observable<any> {
    // API: http://127.0.0.1:8000/api/batches/batches-by-course/{courseId}/
    return this.http.get(`${this.baseUrl}batches/batches-by-course/${courseId}/`);
  }

  fetchSubjects(courseId: number): Observable<any> {
    // FIX: Using dynamic courseId for the subjects API call.
    // New API: http://127.0.0.1:8000/api/courses/{courseId}/subjects/
    return this.http.get(`${this.baseUrl}courses/${courseId}/subjects/`);
  }

  createExam(payload: any): Observable<any> {
    // API: http://127.0.0.1:8000/api/exams/exam/create/
    return this.http.post(`${this.baseUrl}exams/create-exam/`, payload);
  }
}
