import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CodeExecutionService {

  private API_URL = 'http://localhost:8000/api/execute/';

  constructor(private http: HttpClient) {}

  runCode(payload: {
    language: string;
    code: string;
    input?: string;
  }): Observable<any> {
    return this.http.post(this.API_URL, payload);
  }
}
