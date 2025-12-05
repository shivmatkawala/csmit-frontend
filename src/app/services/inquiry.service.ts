import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InquiryPayload {
  name: string;
  phone_number: string;
  email: string;
  course_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  // Postman working URL base: http://127.0.0.1:8000
  private baseUrl = 'http://127.0.0.1:8000'; 

  constructor(private http: HttpClient) { }

  createInquiry(data: InquiryPayload): Observable<any> {
    // Exact URL from Postman: http://127.0.0.1:8000/api/inquiries/create/
    return this.http.post(`${this.baseUrl}/api/inquiries/create/`, data);
  }

  getInquiries(): Observable<InquiryPayload[]> {
    // Exact URL: http://127.0.0.1:8000/api/inquiries/list/
    return this.http.get<InquiryPayload[]>(`${this.baseUrl}/api/inquiries/list/`);
  }
}