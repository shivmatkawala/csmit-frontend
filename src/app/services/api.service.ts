import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// NEW INTERFACE: /api/users/all/ endpoint से आने वाले User data के लिए (Previous logic se)
// Ab iska upyog sirf client-side structure ke liye hoga.
export interface User {
  id: number;
  email: string; 
  password: string; 
  role_id: number; 
  first_name: string;
  last_name: string;
}

// Login response structure ke liye interfaces (Existing)
// Is response mein server ko role_id ya role ka naam bhejna chahiye.
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
  role: string; // FIX: Server dwara bheja gaya role ka naam (e.g., 'Admin'). Ab yehi use hoga.
  // role_id: number; // FIX: role_id हटा दिया गया है क्योंकि सर्वर इसे नहीं भेज रहा है।
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

  private baseUrl = 'http://127.0.0.1:8000/api/'; 
  private readonly STORAGE_KEY = 'cshub_student_login_data'; // SessionStorage key

  constructor(private http: HttpClient) {}

  /** LOGIN - Server ko username aur password bhejkar authentication karein */
  // FIX: Ab yeh method sirf username aur password accept karta hai.
  login(username: string, password: string): Observable<LoginResponse> {
    // FIX: URL को 'users/login/' endpoint के साथ पूरा किया गया है।
    // FIX: Data payload mein ab sirf 'username' aur 'password' bhejenge.
    return this.http.post<LoginResponse>(`${this.baseUrl}users/login/`, { username, password })
      .pipe(
        tap(res => {
          // SUCCESSFUL LOGIN: Store data in sessionStorage
          try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(res));
          } catch (e) {
            console.error('Error storing login data in sessionStorage', e);
          }
        }),
        catchError(this.handleError)
      );
  }
  
  // NOTE: Ab hum is method ka upyog nahi kar rahe hain.
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}users/all/`)
      .pipe(catchError(this.handleError));
  }


  /** GET Stored Login Data */
  getStoredStudentData(): LoginResponse | null { // Is function ka upyog student-dashboard.component.ts mein hoga
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as LoginResponse;
      }
    } catch (e) {
      console.error('Error retrieving or parsing login data from sessionStorage', e);
    }
    return null;
  }
  
  /** LOGOUT - Data remove karne ke liye */
  clearStoredStudentData(): void {
      sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /** CREATE (POST) Resume/Student (Form Submission) */
  submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // FIX: URL को 'students/' endpoint के साथ पूरा किया गया है。
    return this.http.post(`${this.baseUrl}students/`, resumeData, { headers }) 
      .pipe(catchError(this.handleError));
  }

  /** Create new student (Original Method) */
  createStudent(student: Student): Observable<any> {
    // FIX: URL को 'students/' endpoint के साथ पूरा किया गया है。
    return this.http.post(`${this.baseUrl}students/`, student);
  }


  /** READ (GET) all resumes */
  getAllResumes(): Observable<any[]> {
    // FIX: URL को 'resumes/' endpoint के साथ पूरा किया गया है。
    return this.http.get<any[]>(`${this.baseUrl}resumes/`)
      .pipe(catchError(this.handleError));
  }

  /** READ (GET) single resume */
  getResumeById(id: number): Observable<any> {
    // FIX: URL को 'resumes/{id}/' endpoint के साथ पूरा किया गया है。
    return this.http.get<any>(`${this.baseUrl}resumes/${id}/`)
      .pipe(catchError(this.handleError));
  }

  // Get all students 
  getStudents(): Observable<any> {
    // FIX: URL को 'students/' endpoint के साथ पूरा किया गया है。
    return this.http.get(`${this.baseUrl}students/`);
  }

  // Get single student by ID
  getStudent(id: number): Observable<any> {
    // FIX: URL को 'students/{id}/' endpoint के साथ पूरा किया गया है。
    return this.http.get(`${this.baseUrl}students/${id}/`);
  }

  // Update a student
  updateStudent(id: number, data: Student): Observable<any> {
    return this.http.put(`${this.baseUrl}students/${id}/`, data);
  }

  // Delete a student
  deleteStudent(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}students/${id}/`);
  }

  // Get resume data for a student
  getResumeData(studentId: string | number): Observable<any> {
    // URL FIXED to match Django Router: /api/students/{id}/
    return this.http.get<any>(`${this.baseUrl}students/${studentId}/`);
  }

  /** Generic error handler */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Something went wrong!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Check if error.error is a string or an object with a message property
      // Server se aaya hua specific error message ya 'Error' object ko use karein
      errorMessage = error.error?.message || error.error?.error || error.error || error.message; 
      
      // Agar error string hai aur server ki taraf se hai, toh usse seedha use karein
      if (typeof error.error === 'string' && error.error.length > 0) {
        errorMessage = error.error;
      }
    }
    console.error('API Error:', errorMessage);
    // throwError() ko function ke taur par call karein.
    return throwError(() => new Error(errorMessage)); 
  }

}
