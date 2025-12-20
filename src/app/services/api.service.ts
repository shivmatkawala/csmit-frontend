import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// --- Interfaces (Same as before) ---
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
    studentbatchid: number;
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

  //  FIXED: Hardcoded IP hata diya hai. Ab ye Proxy ke through jayega.
  private baseUrl = '/api/'; 
  private readonly STORAGE_KEY = 'cshub_student_login_data';

  /** Login Data check karne ke liye */
  getUserId(): string {
    const storedData = sessionStorage.getItem(this.STORAGE_KEY);
    try {
      if (storedData) {
        const loginData = JSON.parse(storedData);
        if (loginData && loginData.userId) {
          return loginData.userId;
        }
      }
    } catch (e) {
      console.error('Error parsing login data', e);
    }
    return ''; 
  }

  /** 🔑 LOGIN - Ab ye mobile aur laptop dono par kaam karega */
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

  getStoredStudentData(): LoginResponse | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as LoginResponse;
      }
    } catch (e) {
      console.error('Error retrieving session data', e);
    }
    return null;
  }
  
  clearStoredStudentData(): void {
      sessionStorage.removeItem(this.STORAGE_KEY);
  }

  fetchStudentBatches(userId: string): Observable<StudentBatchDetails[]> {
      const apiUrl = `${this.baseUrl}exams/student-batches/${userId}/`;
      return this.http.get<StudentBatchDetails[]>(apiUrl).pipe(catchError(this.handleError));
  }

  submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}students/`, resumeData, { headers }) 
      .pipe(catchError(this.handleError));
  }

  createStudent(student: Student): Observable<any> {
    return this.http.post(`${this.baseUrl}students/`, student).pipe(catchError(this.handleError));
  }

  getResumeData(studentId: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}students/${studentId}/`).pipe(catchError(this.handleError));
  }

  /** Generic error handler */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Something went wrong!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      const errorBody = error.error;
      if (typeof errorBody === 'object' && errorBody !== null) {
          errorMessage = errorBody.message || errorBody.error || error.statusText || `Server Error (Status: ${error.status})`;
      } else {
          errorMessage = error.message;
      }
    }
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage)); 
  }
}