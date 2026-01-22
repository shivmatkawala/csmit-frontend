import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InquiryPayload {
  id?: number; 
  name: string;
  phone_number: string;
  email: string;
  course_name: string;
  created_at?: string; 
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

  // 3. Delete Single Inquiry (Manually)
  deleteInquiry(id: number): Observable<any> {
    // Safety Check: Prevent crash if ID is undefined
    if (id === undefined || id === null) {
      console.warn('Attempted to delete inquiry with undefined ID');
      throw new Error('Invalid ID provided for deletion');
    }
    return this.http.delete(`${this.baseUrl}/delete/`, { params: { id: id.toString() } });
  }

  // 4. Delete All Inquiries
  deleteAllInquiries(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/`, { params: { delete_all: 'true' } });
  }

  // 5. Delete by Date Range
  deleteInquiriesByDate(startDate: string, endDate: string): Observable<any> {
    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);
      
    return this.http.delete(`${this.baseUrl}/delete/`, { params });
  }
}