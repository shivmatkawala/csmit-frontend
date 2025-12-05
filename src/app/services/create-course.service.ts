import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface for the Subject data structure.
 */
export interface Subject {
  subjectid?: number;
  subjectname: string;
}

/**
 * Interface for the Course data structure.
 * * FIX: We have made fields Mandatory (removed '?') again to satisfy 
 * the strict typing in 'manage-course' and 'create-course' components.
 * The service will handle the mapping from backend lowercase fields.
 */
export interface Course {
  courseId: number;      // Now Mandatory
  courseName: string;    // Now Mandatory
  contentUrl: string;    // Now Mandatory
  subjects: Subject[];
  
  // Optional: You can keep these if you need to access raw fields, 
  // but the app should primarily use the camelCase versions above.
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CreateCourseService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/courses/';
  
  constructor(private http: HttpClient) { }

  /**
   * CREATE: Sends a POST request to create a new course.
   */
  createCourse(data: { courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    const apiUrl = this.baseUrl + 'course-create/';
    return this.http.post(apiUrl, data);
  }

  /**
   * LIST: Fetches the list of courses from the backend.
   * * FIX: Uses 'pipe(map(...))' to normalize data. 
   * This converts backend snake_case/lowercase to frontend camelCase 
   * ensuring components always get valid strings, fixing the TS errors.
   */
  listCourses(): Observable<Course[]> {
    const apiUrl = this.baseUrl + 'course-list/';
    console.log('Fetching course list from API:', apiUrl);

    return this.http.get<any[]>(apiUrl).pipe(
      map(rawCourses => {
        return rawCourses.map(course => ({
          // Map various possible ID fields to 'courseId'
          courseId: course.courseId || course.courseid || course.contentid || 0,
          
          // Map various possible Name fields to 'courseName'
          courseName: course.courseName || course.coursename || course.contentname || 'Unnamed Course',
          
          // Map content URL
          contentUrl: course.contentUrl || course.contenturl || '',
          
          // Ensure subjects is an array
          subjects: course.subjects || [],
          
          created_at: course.created_at
        }));
      })
    );
  }

  /**
   * UPDATE: Updates an existing course.
   */
  updateCourse(data: { courseId: number, courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    if (!data.courseId) {
      return new Observable(observer => observer.error('Course ID is mandatory for update operation.'));
    }
    const apiUrl = this.baseUrl + 'course-update/';
    return this.http.put(apiUrl, data);
  }
  
  /**
   * DELETE: Deletes a course by ID.
   */
  deleteCourse(courseId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}course-delete/${courseId}/`;
    return this.http.delete(apiUrl);
  }
}