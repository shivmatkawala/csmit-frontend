import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ManageBlogService {
  
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api/blog';

  constructor() { }
  createBlogMetadata(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/upload-pdf/`, data);
  }

  
  uploadToS3(presignedUrl: string, file: File): Observable<any> {
   
    const headers = new HttpHeaders({ 
      'Content-Type': 'application/pdf' 
    });

    return this.http.put(presignedUrl, file, {
      headers: headers,
      reportProgress: true,
      observe: 'events'
    });
  }

  getBlogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/list/`);
  }

  getDownloadLink(id: number): Observable<{download_url: string}> {
    return this.http.get<{download_url: string}>(`${this.baseUrl}/${id}/download/`);
  }
}