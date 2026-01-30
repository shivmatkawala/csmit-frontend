import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CodexaRequest {
  message: string;
  question?: string;
  code?: string;
}

export interface CodexaResponse {
  reply: string;
  type?: 'question' | 'chat';
}

@Injectable({
  providedIn: 'root'
})
export class CodexaChatService {

  private apiUrl = 'http://localhost:8000/api/codexa/chat/';


  constructor(private http: HttpClient) {}

  sendMessage(payload: CodexaRequest): Observable<CodexaResponse> {
    return this.http.post<CodexaResponse>(this.apiUrl, payload);
  }
}
