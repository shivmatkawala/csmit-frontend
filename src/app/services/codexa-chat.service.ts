import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

  // ✅ FIXED: Hardcoded localhost hata diya — ab environment se URL aayega
  private apiUrl = `${environment.apiBaseUrl}/codexa/chat/`;

  constructor(private http: HttpClient) {}

  sendMessage(payload: CodexaRequest): Observable<CodexaResponse> {
    return this.http.post<CodexaResponse>(this.apiUrl, payload);
  }
}
