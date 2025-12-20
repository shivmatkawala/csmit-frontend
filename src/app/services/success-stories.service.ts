import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

// Interface define kar rahe hain data type ke liye
export interface SuccessStory {
  id?: number;
  name: string;
  role: string;
  company: string;
  package: string;
  quote: string;
  image: string;
  logo: string; // Company logo URL
}

@Injectable({
  providedIn: 'root'
})
export class SuccessStoriesService {
  
  private apiUrl = '/api/success-stories/'; 

  constructor(private http: HttpClient) { }

  getStories(): Observable<SuccessStory[]> {
    return this.http.get<SuccessStory[]>(this.apiUrl);
  }

  createStory(story: SuccessStory): Observable<SuccessStory> {
    return this.http.post<SuccessStory>(this.apiUrl, story);
  }

  updateStory(id: number, story: SuccessStory): Observable<SuccessStory> {
    // URL: /api/success-stories/{id}/
    return this.http.put<SuccessStory>(`${this.apiUrl}${id}/`, story);
  }

  deleteStory(id: number): Observable<any> {
    // URL: /api/success-stories/{id}/
    return this.http.delete(`${this.apiUrl}${id}/`);
  }
}