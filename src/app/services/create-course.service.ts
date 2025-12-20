import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
  // ✅ FIXED: Hardcoded IP hata diya gaya hai Proxy compatibility ke liye
  private readonly baseUrl = '/api/courses/';
  
  constructor(private http: HttpClient) { }

  /** CREATE Course */
  createCourse(data: { courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    const apiUrl = this.baseUrl + 'course-create/';
    return this.http.post(apiUrl, data);
  }

  /** LIST Courses with Data Normalization */
  listCourses(): Observable<Course[]> {
    const apiUrl = this.baseUrl + 'course-list/';

    return this.http.get<any[]>(apiUrl).pipe(
      map(rawCourses => {
        return rawCourses.map(course => ({
          // Backend snake_case/lowercase ko frontend camelCase mein map kar rahe hain
          courseId: course.courseId || course.courseid || course.contentid || 0,
          courseName: course.courseName || course.coursename || course.contentname || 'Unnamed Course',
          contentUrl: course.contentUrl || course.contenturl || '',
          subjects: course.subjects || [],
          created_at: course.created_at
        }));
      })
    );
  }

  /** UPDATE Course */
  updateCourse(data: { courseId: number, courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    if (!data.courseId) {
      return new Observable(observer => observer.error('Course ID is mandatory for update.'));
    }
    const apiUrl = this.baseUrl + 'course-update/';
    return this.http.put(apiUrl, data);
  }
  
  /** DELETE Course */
  deleteCourse(courseId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}course-delete/${courseId}/`;
    return this.http.delete(apiUrl);
  }
}