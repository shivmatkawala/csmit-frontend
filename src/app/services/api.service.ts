import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// --- Interfaces for Data Models ---
export interface User {
  id: number;
  email: string; 
  password: string; 
  role_id: number; 
  first_name: string;
  last_name: string;
}

export interface StudentInfo {
  userId: string; 
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  experience_type: string;
  education: any[];
  experience: any[];
  skills: any[];
  projects: any[];
  batch_id?: number; 
  course_id?: number; 
}

export interface LoginResponse {
  message: string;
  role: string; 
  userId: string; 
  username: string;
  info: StudentInfo;
  batch_id?: number;
  course_id?: number; 
  
}

export interface StudentBatchDetails {
    studentbatchid?: number;
    trainerbatchid?: number;
    batchid: number;
    userid: string;
    batch_name: string;
    course_id: number;
}

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
  
  private http = inject(HttpClient); 

  // Base URL configuration (Using relative path for proxy)
  private baseUrl = '/api/'; 
  private readonly STORAGE_KEY = 'cshub_student_login_data';

  /** Login data se userId nikalne ke liye helper */
  getUserId(): string {
    const storedData = sessionStorage.getItem(this.STORAGE_KEY);
    try {
      if (storedData) {
        const loginData = JSON.parse(storedData);
        return loginData?.userId || '';
      }
    } catch (e) {
      console.error('Error parsing login data', e);
    }
    return ''; 
  }

  /** 🔑 Authenticate user and store session data */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}users/login/`, { username, password })
      .pipe(
        tap(res => {
          try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(res));
          } catch (e) {
            console.error('Error storing login data', e);
          }
        }),
        catchError(this.handleError)
      );
  }

  /** Retrieve stored session data */
  getStoredStudentData(): LoginResponse | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      return data ? (JSON.parse(data) as LoginResponse) : null;
    } catch (e) {
      console.error('Error retrieving session data', e);
      return null;
    }
  }
  
  /** Session clear karne ke liye */
  clearStoredStudentData(): void {
      sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /** 🎓 Students ke batches fetch karne ke liye (Existing) */
  fetchStudentBatches(userId: string): Observable<StudentBatchDetails[]> {
      const apiUrl = `${this.baseUrl}exams/student-batches/${userId}/`;
      return this.http.get<StudentBatchDetails[]>(apiUrl).pipe(catchError(this.handleError));
  }

  /** 👨‍🏫 Trainers ke batches fetch karne ke liye (New logic) */
  fetchTrainerBatches(userId: string): Observable<StudentBatchDetails[]> {
      // Direct call to the trainer-batches endpoint in the batches app
      const apiUrl = `${this.baseUrl}batches/trainer-batches/${userId}/`;
      return this.http.get<StudentBatchDetails[]>(apiUrl).pipe(catchError(this.handleError));
  }

  /** Resume submission logic */
  submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}students/`, resumeData, { headers }) 
      .pipe(catchError(this.handleError));
  }

  /** New student record create karne ke liye */
  createStudent(student: Student): Observable<any> {
    return this.http.post(`${this.baseUrl}students/`, student).pipe(catchError(this.handleError));
  }

  /** User profile/resume data fetch karne ke liye */
  getResumeData(studentId: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}students/${studentId}/`).pipe(catchError(this.handleError));
  }

  /** 🛠 Generic error handler */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Something went wrong!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Backend error responses
      const errorBody = error.error;
      if (typeof errorBody === 'object' && errorBody !== null) {
          errorMessage = errorBody.message || errorBody.detail || errorBody.error || error.statusText || `Server Error (Status: ${error.status})`;
      } else {
          errorMessage = error.message;
      }
    }
    console.error('API Service Error:', errorMessage);
    return throwError(() => new Error(errorMessage)); 
  }
}