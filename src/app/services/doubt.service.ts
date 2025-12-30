import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// --- Interfaces based on your Serializers ---

export interface Subject {
  subjectid: number;
  subjectname: string;
}

export interface User {
  userid: string; 
  username: string;
}

export interface Doubt {
  doubtid: number;
  subjectid?: Subject; // Made optional to fix HTML warnings
  userid?: User;       // Made optional to fix HTML warnings
  doubttext: string;
  created_at: string;
  is_active: boolean;
  solutions?: Solution[]; 
  
  // Frontend State Properties
  showReply?: boolean;    
  tempReply?: string; // New: To preserve reply text while typing during refresh
}

export interface Solution {
  solutionid: number;
  doubtid: Doubt; 
  solution: string;
  userid?: User; // Made optional to fix HTML warnings
  created_at: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DoubtService {
  // ✅ FIXED: Base URL updated to include 'doubts/'
  // Yeh ab 'http://127.0.0.1:8000/api/doubts/list-doubts/' par request karega
  private baseUrl = 'http://127.0.0.1:8000/api/doubts/'; 

  constructor(private http: HttpClient) { }

  // Get all Doubts
  getAllDoubts(): Observable<Doubt[]> {
    return this.http.get<Doubt[]>(`${this.baseUrl}list-doubts/`);
  }

  // Get all Solutions
  getAllSolutions(): Observable<Solution[]> {
    return this.http.get<Solution[]>(`${this.baseUrl}list-solutions/`);
  }

  // Create Doubt
  createDoubt(data: { subjectid: number; userid: string; doubttext: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}create-doubt/`, data);
  }

  // Create Solution
  createSolution(data: { doubtid: number; userid: string; solution: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}create-solution/`, data);
  }
}