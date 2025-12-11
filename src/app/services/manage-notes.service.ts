import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Note {
  id: number;
  title: string;
  description: string;
  category: string;
  subject: string;
  pdf_url: string;
  uploaded_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManageNotesService {
  
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api/notes';

  constructor() { }

  // 1. Metadata Create karo
  createNoteMetadata(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/upload/`, data);
  }

  // 2. Upload File to S3
  uploadToS3(presignedUrl: string, file: File): Observable<any> {
    return this.http.put(presignedUrl, file, {
      reportProgress: true,
      observe: 'events'
    });
  }

  // 3. Notes Fetch karo
  getNotes(subject?: string, category?: string): Observable<Note[]> {
    let params = new HttpParams();
    if (subject) params = params.set('subject', subject);
    if (category) params = params.set('category', category);

    return this.http.get<Note[]>(`${this.baseUrl}/list/`, { params });
  }

  // 4. Download Link
  getDownloadLink(id: number): Observable<{download_url: string}> {
    return this.http.get<{download_url: string}>(`${this.baseUrl}/${id}/download/`);
  }

  // 5. NEW: Saare Unique Subjects laao (Navbar Dropdown ke liye)
  getAllSubjects(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/subjects/`);
  }
}