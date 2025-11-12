import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface AttemptResult {
  attemptid: number;
  total_score: number;
  max_score: number;
  status_message: string;
}

// NEW: विस्तृत AI फीडबैक के साथ उत्तरों के लिए इंटरफ़ेस
interface DetailedAnswer {
    questionid: number;
    question_text: string;
    question_type_id: number; // 2: Descriptive, 3: Coding
    student_answer: string;
    ai_score: number;
    ai_feedback: string;
    points_earned: number;
    max_points: number;
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

  /**
   * API: http://127.0.0.1:8000/api/exams/evaluate-mcq/8/ (POST Method)
   * केवल MCQ मूल्यांकन के लिए।
   */
  evaluateMCQ(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/evaluate-mcq/${attemptId}/`;
    return this.http.post(apiUrl, {}); 
  }
  
  /**
   * API: http://127.0.0.1:8000/api/exams/evaluate-ai/7/ (POST Method)
   * Descriptive/Coding मूल्यांकन के लिए (AI आधारित)।
   */
  evaluateAI(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/evaluate-ai/${attemptId}/`;
    return this.http.post(apiUrl, {}); 
  }
  
  /**
   * API: http://127.0.0.1:8000/api/exams/results/calculate/{attemptId}/ (POST Method)
   * अंतिम स्कोर गणना के लिए (MCQ + AI स्कोर को जोड़कर)।
   */
  calculateResults(attemptId: number): Observable<any> {
    const apiUrl = `${this.baseUrl}exams/results/calculate/${attemptId}/`; 
    return this.http.post(apiUrl, {});
  }
  
  /**
   * NEW: API: http://127.0.0.1:8000/api/exams/evaluate-complete/13/ (POST Method)
   * इस सिंगल API कॉल से सर्वर पर तीनों मूल्यांकन (MCQ, AI, Calculate) ट्रिगर होते हैं
   * और तुरंत अंतिम परिणाम (AttemptResult) क्लाइंट को लौटाया जाता है।
   * @param attemptId - वर्तमान प्रयास (Attempt) की ID।
   * @returns AttemptResult - अंतिम परिणाम का ऑब्जेक्ट।
   */
  evaluateAndFetchResult(attemptId: number): Observable<AttemptResult> {
    const apiUrl = `${this.baseUrl}exams/evaluate-complete/${attemptId}/`; 
    // आपके निर्देशानुसार, इसे POST मेथड का उपयोग करने के लिए अपडेट किया गया है।
    console.log(`Calling final evaluation API with POST: ${apiUrl}`);
    return this.http.post<AttemptResult>(apiUrl, {}); 
  }

  /**
   * NEW: API to fetch detailed student answers with AI feedback for a given attempt.
   * @param attemptId - वर्तमान प्रयास (Attempt) की ID।
   * @returns Observable<DetailedAnswer[]> - AI feedback सहित उत्तरों की सूची।
   */
  fetchDetailedAnswers(attemptId: number): Observable<DetailedAnswer[]> {
    const apiUrl = `${this.baseUrl}exams/results/answers/${attemptId}/`;
    console.log(`Fetching detailed answers: ${apiUrl}`);
    return this.http.get<DetailedAnswer[]>(apiUrl);
  }
}