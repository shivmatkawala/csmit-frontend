import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SuccessStory {
  id?: number;
  name: string;
  role: string;
  company: string;
  package: string;
  quote: string;
  image: string;
  logo: string; 
}

@Injectable({
  providedIn: 'root'
})
export class SuccessStoriesService {
  
  // API Endpoints
  private apiUrl = '/api/success-stories/'; 
  private uploadUrlApi = '/api/get-upload-urls/'; 

  constructor(private http: HttpClient) { }

  /**
   * Fetch all success stories
   */
  getStories(): Observable<SuccessStory[]> {
    return this.http.get<SuccessStory[]>(this.apiUrl);
  }

  /**
   * Request S3 Presigned URLs from Backend
   * @param imageMime - MIME type of the student image (e.g. 'image/jpeg')
   * @param logoMime - MIME type of the company logo (e.g. 'image/png')
   */
  getPresignedUrls(imageMime: string, logoMime: string): Observable<any> {
    return this.http.post(this.uploadUrlApi, { 
      image_mime: imageMime, 
      logo_mime: logoMime 
    });
  }

  /**
   * Upload file directly to S3 using PUT
   * Note: The AuthInterceptor handles stripping the Bearer token for S3 URLs
   */
  uploadToS3(url: string, file: File): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });
    return this.http.put(url, file, { headers });
  }

  /**
   * Save the complete success story record to the database
   */
  createStory(story: SuccessStory): Observable<SuccessStory> {
    return this.http.post<SuccessStory>(this.apiUrl, story);
  }

  /**
   * Update an existing success story
   */
  updateStory(id: number, story: SuccessStory): Observable<SuccessStory> {
    return this.http.put<SuccessStory>(`${this.apiUrl}${id}/`, story);
  }

  /**
   * Remove a success story
   */
  deleteStory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }
}