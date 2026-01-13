import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// ✅ FIXED: Hardcoded IP hata diya gaya hai. Ab ye proxy.conf.json se handle hoga.
const API_BASE_URL = '/api';

export interface Subject {
  subjectid?: number;
  subjectname: string;
}

export interface Course {
  courseId: number;
  courseName: string;
  contentUrl: string;
  subjects: Subject[];
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateCourseService {
  private http = inject(HttpClient);
  
  // Dynamic API URLs
  private readonly baseUrl = `${API_BASE_URL}/courses/`;

  createCourse(data: { courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}course-create/`, data);
  }

  listCourses(): Observable<Course[]> {
    return this.http.get<any[]>(`${this.baseUrl}course-list/`).pipe(
      map(rawCourses => rawCourses.map(course => ({
        courseId: course.courseId || course.courseid || course.contentid || 0,
        courseName: course.courseName || course.coursename || course.contentname || 'Unnamed Course',
        contentUrl: course.contentUrl || course.contenturl || '',
        subjects: course.subjects || [],
        created_at: course.created_at
      }))),
      catchError(error => {
        console.error('Error fetching course list:', error);
        return throwError(() => error);
      })
    );
  }

  updateCourse(data: { courseId: number, courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    if (!data.courseId) {
      return throwError(() => new Error('Course ID is mandatory for update.'));
    }
    return this.http.put(`${this.baseUrl}course-update/`, data);
  }
  
  deleteCourse(courseId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}course-delete/${courseId}/`);
  }
}