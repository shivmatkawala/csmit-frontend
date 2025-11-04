import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Structure for Course data
 */
export interface Course {
  courseid: number;
  coursename: string;
}

/**
 * Structure of each batch received from the API
 */
export interface BatchDetail {
  batchId: number;
  batchName: string;
  // Assuming other properties like startTime, endTime, etc.
}

/**
 * Structure of each user received from the API (UPDATED)
 * Assuming the API returns a role and additional details for filtering/display.
 */
export interface User {
  id: string; // User ID (e.g., USR001, USR002, etc.)
  username: string; // User name
  // Note: The actual component uses DetailedUser interface. We keep this minimal 
  // but note that the component assumes additional fields (role, details) are available.
  // For production, the API should return these fields.
}

/**
 * Structure of the data payload sent to the API for batch assignment
 */
export interface AssignPayload {
  batchId: number; // Batch ID
  userId: string; // User ID (string)
  role: 'student' | 'trainer'; // User role
}

// API Endpoints
const BASE_URL = 'http://127.0.0.1:8000/api/'; 

const ALL_USERS_API = BASE_URL + 'users/all/'; 
const ALL_COURSES_API = BASE_URL + 'courses/course-list/'; 

const BATCHES_BY_COURSE_BASE_API = BASE_URL + 'batches/batches-by-course/';
const ASSIGN_USER_TO_BATCH_API = BASE_URL + 'batches/assign-user-to-batch/';

@Injectable({
  providedIn: 'root'
})
export class AssignUserToBatchService {

  constructor(private http: HttpClient) { }

  /**
   * Sabhi courses ko fetch karta hai.
   */
  getCourses(): Observable<Course[]> {
    console.log('Fetching all courses from:', ALL_COURSES_API);
    return this.http.get<Course[]>(ALL_COURSES_API);
  }

  /**
   * Sabhi users (User ID aur name) ko API se fetch karta hai.
   * NOTE: The component's logic expects 'role' and 'details' in the User object, 
   * which may need adjustment if your actual API doesn't provide them.
   */
  getUsers(): Observable<User[]> {
    console.log('Fetching all users from:', ALL_USERS_API);
    return this.http.get<User[]>(ALL_USERS_API);
  }

  /**
   * Batches ko specific Course ID ka upyog karke fetch karta hai.
   * @param courseId - Course ID jiske batches fetch karne hain.
   */
  getBatchesByCourse(courseId: number): Observable<BatchDetail[]> {
    const url = `${BATCHES_BY_COURSE_BASE_API}${courseId}/`;
    console.log('Fetching batches for Course ID', courseId, 'from:', url);
    return this.http.get<BatchDetail[]>(url); 
  }

  /**
   * User ko specific batch aur role assign karta hai (POST request).
   */
  assignUserToBatch(payload: AssignPayload): Observable<any> {
    console.log('Assigning user to batch with payload:', payload);
    return this.http.post(ASSIGN_USER_TO_BATCH_API, payload);
  }
}
