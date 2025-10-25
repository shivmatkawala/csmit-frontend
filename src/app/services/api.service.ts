import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

  private baseUrl = 'http://127.0.0.1:8000/api'; // main API root

  constructor(private http: HttpClient) {}

  /** LOGIN */
  login(username: string, password: string, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login/`, { username, password, role })
      .pipe(catchError(this.handleError));
  }

  /** CREATE (POST) Resume */
  // submitResume(resumeData: any): Observable<any> {
  //   const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  //   return this.http.post(`${this.baseUrl}/create-student/`, resumeData, { headers })
  //     .pipe(catchError(this.handleError));
  // }

    submitResume(resumeData: any): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}/students/`, resumeData, { headers })
      .pipe(catchError(this.handleError));
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

    // Create new student
  // createStudent(student: Student): Observable<any> {
  //   return this.http.post(`${this.baseUrl}/create-student/`, student);
  // }

  createStudent(student: Student): Observable<any> {
    return this.http.post(`${this.baseUrl}/students/`, student);
  }

  // Get all students (you can implement this in Django later)
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

  // Get resume data for a student
getResumeData(studentId: number): Observable<Student> {
  return this.http.get<Student>(`${this.baseUrl}/create-student/${studentId}/`);
}

  /** Generic error handler */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Something went wrong!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error (${error.status}): ${JSON.stringify(error.error)}`;
    }
    console.error('API Error:', errorMessage);
    return throwError(() => errorMessage);
  }

  
}
