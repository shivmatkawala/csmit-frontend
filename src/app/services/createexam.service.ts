import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class examAPi {
  private baseUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) {}

  fetchCourses(): Observable<any> {
    // API: http://127.0.0.1:8000/api/courses/course-list/
    return this.http.get(`${this.baseUrl}courses/course-list/`);
  }
  
  // NOTE: This function is still used by the CreateExamComponent to get ALL exams
  // but it is generally recommended to use the new filtered endpoint for students.
  listAllExams(): Observable<any> { 
    // API: http://127.0.0.1:8000/api/exams/exam-list/
    console.log('Fetching all available exams from:', `${this.baseUrl}exams/exam-list/`);
    return this.http.get(`${this.baseUrl}exams/exam-list/`);
  }
  
  /**
   * FIX: Student Dashboard के लिए नया फ़िल्टर्ड API (Django URL से मेल खाता है)
   * @param courseId - छात्र का Course ID
   * @param batchId - छात्र का Batch ID
   */
  fetchStudentExams(courseId: number, batchId: number): Observable<any> {
    // Django URL: /exams/student-exams/<int:course_id>/<int:batch_id>/
    const apiUrl = `${this.baseUrl}exams/student-exams/${courseId}/${batchId}/`;
    console.log('Fetching student-specific exams from:', apiUrl);
    return this.http.get(apiUrl);
  }
  
  /**
   * NEW: Exam Questions फ़ेच करने के लिए API
   * @param examId - Exam ID jiske questions chahiye.
   */
  fetchExamQuestions(examId: number): Observable<any> {
    // API: http://127.0.0.1:8000/api/exams/exam-questions/{examId}/
    const apiUrl = `${this.baseUrl}exams/exam-questions/${examId}/`;
    console.log('Fetching exam questions for examId:', examId, 'from:', apiUrl);
    return this.http.get(apiUrl);
  }
  
  fetchBatches(courseId: number): Observable<any> {
    // API: http://127.0.0.1:8000/api/batches/batches-by-course/{courseId}/
    return this.http.get(`${this.baseUrl}batches/batches-by-course/${courseId}/`);
  }

  fetchSubjects(courseId: number): Observable<any> {
    // New API: http://127.0.0.1:8000/api/courses/{courseId}/subjects/
    return this.http.get(`${this.baseUrl}courses/${courseId}/subjects/`);
  }

  createExam(payload: any): Observable<any> {
    // API: http://127.0.0.1:8000/api/exams/create-exam/
    return this.http.post(`${this.baseUrl}exams/create-exam/`, payload);
  }
}