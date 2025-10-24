import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// Login response structure ke liye interfaces
export interface StudentInfo {
  csmit_id: string;
  education: any[];
  experience: any[];
  skills: any[];
  projects: any[];
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  experience_type: string;
}

export interface LoginResponse {
  message: string;
  role: string;
  csmit_id: string;
  username: string;
  info: StudentInfo;
}

// Existing Student interface (used for POST/PUT operations)
export interface Student {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  course: string;
  address?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://127.0.0.1:8000/api'; 
  private loggedInStudentData: LoginResponse | null = null; 

  constructor(private http: HttpClient) {}

  /** LOGIN - Data Storage ke saath */
  login(username: string, password: string, role: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login/`, { username, password, role })
      .pipe(
        tap(res => {
          this.loggedInStudentData = res; 
        }),
        catchError(this.handleError)
      );
  }

  /** GET Stored Login Data */
  getStoredStudentData(): LoginResponse | null {
    return this.loggedInStudentData;
  }
  
  /** CREATE (POST) Resume/Student (Form Submission) - URL FIX: students/ */
  submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // URL FIXED to match Django Router: /api/students/
    return this.http.post(`${this.baseUrl}/students/`, resumeData, { headers }) 
      .pipe(catchError(this.handleError));
  }

  /** Create new student (Original Method - URL FIX: students/) */
  createStudent(student: Student): Observable<any> {
    // URL FIXED to match Django Router: /api/students/
    return this.http.post(`${this.baseUrl}/students/`, student);
  }


  /** READ (GET) all resumes */
  getAllResumes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/resumes/`)
      .pipe(catchError(this.handleError));
  }

  /** READ (GET) single resume */
  getResumeById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/resumes/${id}/`)
      .pipe(catchError(this.handleError));
  }

  // Get all students 
  getStudents(): Observable<any> {
    return this.http.get(`${this.baseUrl}/students/`);
  }

  // Get single student by ID
  getStudent(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/students/${id}/`);
  }

  // Update a student
  updateStudent(id: number, data: Student): Observable<any> {
    return this.http.put(`${this.baseUrl}/students/${id}/`, data);
  }

  // Delete a student
  deleteStudent(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/students/${id}/`);
  }

  // Get resume data for a student - URL FIX: students/
  getResumeData(studentId: string | number): Observable<any> {
    // URL FIXED to match Django Router: /api/students/{id}/
    return this.http.get<any>(`${this.baseUrl}/students/${studentId}/`);
  }

  /** Generic error handler */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Something went wrong!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = error.error || error.message; 
    }
    console.error('API Error:', errorMessage);
    return throwError(() => error); 
  }

}
