import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface for the Subject data structure (as received from the API).
 */
export interface Subject {
  subjectid?: number; // Added optional for safety, though usually present
  subjectname: string;
}

/**
 * Interface for the core Course data structure.
 * This is the shape when FETCHING/LISTING.
 */
export interface Course {
  courseId?: number; // Keep as optional for safety, but check for it in component
  courseName: string;
  contentUrl: string; // Assuming the content URL is either directly here or mapped
  subjects: Subject[]; // FIX: Now an array of Subject objects for listing/fetching
  // Other fields like contentid, created_at, etc., can be ignored for this component's logic.
}

@Injectable({
  providedIn: 'root'
})
export class CreateCourseService {
  private readonly baseUrl = 'http://127.0.0.1:8000/api/courses/';
  
  constructor(private http: HttpClient) { }

  /**
   * For CREATE, we assume the backend takes a simple array of subject names (strings).
   */
  createCourse(data: { courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    const apiUrl = this.baseUrl + 'course-create/';
    console.log('Sending creation payload to API:', data);
    return this.http.post(apiUrl, data);
  }

  /**
   * For LISTING, we expect the Course interface with Subject[] array.
   */
  listCourses(): Observable<Course[]> {
    const apiUrl = this.baseUrl + 'course-list/';
    console.log('Fetching course list from API:', apiUrl);
    return this.http.get<Course[]>(apiUrl);
  }

  /**
   * For UPDATE, we assume the backend takes a courseId and a simple array of subject names (strings).
   */
  updateCourse(data: { courseId: number, courseName: string, contentUrl: string, subjects: string[] }): Observable<any> {
    if (!data.courseId) {
      return new Observable(observer => observer.error('Course ID is mandatory for update operation.'));
    }
    const apiUrl = this.baseUrl + 'course-update/';
    console.log(`Sending update payload for Course ID ${data.courseId}:`, data);
    return this.http.put(apiUrl, data);
  }
  
  deleteCourse(courseId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}course-delete/${courseId}/`;
    console.log(`Sending delete request for Course ID ${courseId}:`, apiUrl);
    return this.http.delete(apiUrl);
  }
}
