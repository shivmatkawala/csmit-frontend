import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface UserRegistrationData {
  username: string; 
  password: string; 
  roleid: number;    
}

export interface User {
    userid: string;
    username: string;
    roleid: number;
    is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // ✅ Relative path for proxy setup
  private apiUrl = '/api/users';
  
  private registerEndpoint = `${this.apiUrl}/register/`; 
  private allUsersEndpoint = `${this.apiUrl}/all/`;
  private deactivateEndpoint = `${this.apiUrl}/deactivate-user/`;
  private reactivateEndpoint = `${this.apiUrl}/reactivate-user/`; 
  private deleteEndpoint = `${this.apiUrl}/delete-user/`;
  private updatePasswordEndpoint = `${this.apiUrl}/update-password/`;
  
  // ✅ New Endpoint for Forgot Password
  private forgotPasswordEndpoint = `${this.apiUrl}/forgot-password/`;

  constructor(private http: HttpClient) { }

  registerUser(userData: UserRegistrationData): Observable<any> {
    return this.http.post<any>(this.registerEndpoint, userData);
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.allUsersEndpoint);
  }

  deactivateUser(userId: string): Observable<any> {
    return this.http.post<any>(this.deactivateEndpoint, { userId });
  }

  reactivateUser(userId: string): Observable<any> {
    return this.http.post<any>(this.reactivateEndpoint, { userId });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.post<any>(this.deleteEndpoint, { userId });
  }

  updatePassword(userId: string, newPassword: string): Observable<any> {
    return this.http.post<any>(this.updatePasswordEndpoint, { userId, newPassword });
  }

  // ✅ New Method to trigger email notification
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(this.forgotPasswordEndpoint, { username: email });
  }
}