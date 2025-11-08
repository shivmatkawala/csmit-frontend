import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface AttemptResult {
  attemptid: number;
  total_score: number;
  max_score: number;
  status_message: string;
}

@Injectable({
  providedIn: 'root'
})
export class examAPi {
  private baseUrl = 'http://127.0.0.1:8000/api/';

  constructor(private http: HttpClient) {}

  fetchCourses(): Observable<any> {
    return this.http.get(`${this.baseUrl}courses/course-list/`);
  }
  
  listAllExams(): Observable<any> { 
    return this.http.get(`${this.baseUrl}exams/exam-list/`);
  }
  
  fetchStudentExams(courseId: number, batchId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/student-exams/${courseId}/${batchId}/`;
    return this.http.get(apiUrl);
  }
  
  fetchExamQuestions(examId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/exam-questions/${examId}/`;
    return this.http.get(apiUrl);
  }
  
  fetchBatches(courseId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}batches/batches-by-course/${courseId}/`);
  }

  fetchSubjects(courseId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}courses/${courseId}/subjects/`);
  }

  createExam(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}exams/create-exam/`, payload);
  }

  createAttempt(payload: any): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/attempt/create/`;
    return this.http.post(apiUrl, payload);
  }

  submitAnswer(payload: any): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/answer/create/`;
    return this.http.post(apiUrl, payload);
  }

  evaluateMCQ(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/evaluate-mcq/${attemptId}/`;
    return this.http.post(apiUrl, {});
  }
  
  evaluateAI(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/evaluate-ai/${attemptId}/`;
    return this.http.post(apiUrl, {});
  }
  
  calculateResults(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/results/calculate/${attemptId}/`;
    return this.http.post(apiUrl, {});
  }
  
  fetchAttemptResult(attemptId: number): Observable<AttemptResult> {
    const apiUrl = `${this.baseUrl}exams/attempt/result/${attemptId}/`; 
    return this.http.get<AttemptResult>(apiUrl);
  }
}