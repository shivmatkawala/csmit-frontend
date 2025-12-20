import { Injectable, inject } from '@angular/core';
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
  private baseUrl = '/api/inquiries'; 
  
  private http = inject(HttpClient);

  constructor() { }

  // 1. Create Inquiry
  createInquiry(data: InquiryPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/create/`, data);
  }

  // 2. List Inquiries
  getInquiries(): Observable<InquiryPayload[]> {
    return this.http.get<InquiryPayload[]>(`${this.baseUrl}/list/`);
  }
}