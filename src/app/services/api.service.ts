import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
// Note: StudentBatchDetails and other interfaces used below need to be defined or imported. 
// Since they were defined in your user-provided content, I'm including them here for completeness/autonomy.

// NEW INTERFACE: /api/users/all/ endpoint से आने वाले User data के लिए
export interface User {
  id: number;
  email: string; 
  password: string; 
  role_id: number; 
  first_name: string;
  last_name: string;
}

// Student Info Structure (Detailed profile data)
export interface StudentInfo {
  // FIX: छात्र ID को userId के रूप में
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
  // FIX: यदि बैच ID सीधे StudentInfo ऑब्जेक्ट के भीतर है
  batch_id?: number; 
  course_id?: number; // FIX: Course ID जोड़ा गया
}

// Login Response Structure (UPDATED)
export interface LoginResponse {
  message: string;
  role: string; 
  userId: string; // FIX: छात्र का मुख्य ID (User ID)
  username: string;
  info: StudentInfo;
  // FIX: यदि batch_id टॉप लेवल पर नहीं आता है, तो भी हम इसे यहाँ रखते हैं
  batch_id?: number;
  course_id?: number; 
}

// NEW INTERFACE: Student ID का उपयोग करके Profile Details fetch करने के लिए (UPDATED)
export interface StudentProfileDetails {
  userId: string; // FIX: Use userId
  batch_id?: number; // वह ID जो हमें चाहिए
  course_id?: number; // Course ID भी यहाँ से fetch कर सकते हैं
  // अन्य आवश्यक डेटा
}

// 👇️ NEW INTERFACE: StudentBatches API से आने वाले डेटा के लिए
export interface StudentBatchDetails {
    studentbatchid: number;
    batchid: number;
    userid: string;
    batch_name: string;
    course_id: number; // Serializer से जोड़ा गया
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
  
  // NOTE: Inject HttpClient here instead of in the constructor for modern Angular structure
  private http = inject(HttpClient); 

  private baseUrl = 'http://127.0.0.1:8000/api/'; 
  private readonly STORAGE_KEY = 'cshub_student_login_data'; // SessionStorage key
  // FIX: Removed hardcoded default ID here: private readonly DEFAULT_USER_ID = 'USR006';

  // The original constructor remains, though 'http' is typically injected via 'inject()' now.
  // constructor(private http: HttpClient) {} 
  
  /**
   * Retrieves the current user ID (userId) from session storage.
   * FIX: Removed default user ID. Returns empty string if not found.
   * @returns The current user ID string or empty string.
   */
  getUserId(): string {
    const storedData = sessionStorage.getItem(this.STORAGE_KEY);
    try {
      if (storedData) {
        const loginData = JSON.parse(storedData);
        // Assuming the login API returns 'userId'
        if (loginData && loginData.userId) {
          return loginData.userId;
        }
      }
    } catch (e) {
      console.error('Error parsing login data from sessionStorage', e);
    }
    console.warn(`No user ID found in session. Please log in.`);
    // FIX: Returning empty string instead of a default hardcoded ID
    return ''; 
  }

  /** LOGIN - Server को username और password bhejkar authentication karein */
  login(username: string, password: string): Observable<LoginResponse> {
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
  

  /** GET Stored Login Data */
  getStoredStudentData(): LoginResponse | null { // Is function का upyog student-dashboard.component.ts mein hoga
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

  /**
    * NEW: Student ID का उपयोग करके StudentBatchDetails fetch करें (BATCH & COURSE ID के लिए)।
    * @param userId - छात्र का userId।
    * @returns StudentBatchDetails[]
    */
  fetchStudentBatches(userId: string): Observable<StudentBatchDetails[]> {
      // Django URL: /exams/student-batches/<str:user_id>/
      const apiUrl = `${this.baseUrl}exams/student-batches/${userId}/`;
      console.log(`Fetching student batches (batch/course ID) for ID: ${userId} from ${apiUrl}`);
      // API एक array of StudentBatchDetails लौटाता है
      // NOTE: Using 'of([])' as a temporary mock if the actual import/service linkage is complex. 
      // Using http.get as intended by the original file:
      return this.http.get<StudentBatchDetails[]>(apiUrl) 
          .pipe(catchError(this.handleError));
  }


  /** CREATE (POST) Resume/Student (Form Submission) */
  submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // FIX: URL को 'students/' endpoint के साथ पूरा किया गया है।
    return this.http.post(`${this.baseUrl}students/`, resumeData, { headers }) 
      .pipe(catchError(this.handleError));
  }

  /** Create new student (Original Method) */
  createStudent(student: Student): Observable<any> {
    return this.http.post(`${this.baseUrl}students/`, student);
  }


  /** READ (GET) single resume or student profile by ID */
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
      // Check if error.error is an object and try to extract a specific message
      const errorBody = error.error;
      if (typeof errorBody === 'object' && errorBody !== null) {
          errorMessage = errorBody.message || errorBody.error || error.statusText || `Server Error (Status: ${error.status})`;
      } else if (typeof errorBody === 'string' && errorBody.length > 0) {
          errorMessage = errorBody;
      } else {
          errorMessage = error.message;
      }
    }
    console.error('API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage)); 
  }

}