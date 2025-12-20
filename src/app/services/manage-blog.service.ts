import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ManageBlogService {
  
  private http = inject(HttpClient);
  
  // ✅ FIXED: Hardcoded IP hata diya hai taaki Ngrok/Proxy kaam kare
  private baseUrl = '/api/blog';

  constructor() { }

  createBlogMetadata(data: any): Observable<any> {
    // URL: /api/blog/upload-pdf/
    return this.http.post(`${this.baseUrl}/upload-pdf/`, data);
  }

  /**
   * Note: presignedUrl direct AWS ki hoti hai, 
   * isliye ise chhedne ki zaroorat nahi hai.
   */
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
    // URL: /api/blog/list/
    return this.http.get<any[]>(`${this.baseUrl}/list/`);
  }

  getDownloadLink(id: number): Observable<{download_url: string}> {
    // URL: /api/blog/{id}/download/
    return this.http.get<{download_url: string}>(`${this.baseUrl}/${id}/download/`);
  }
}