import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Data structure for user registration payload
interface UserRegistrationData {
  username: string; 
  password: string; 
  roleid: number;    
}

// Interface for a user object from the API
export interface User {
    userid: string; // Corrected: Use 'userid' (lowercase 'i') to match backend data
    username: string;
    roleid: number; // 1: Admin, 2: Trainer, 3: Student
    is_active: boolean;
    // Add other properties if available, like first_name, last_name, etc.
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://127.0.0.1:8000/api/users';
  private registerEndpoint = `${this.apiUrl}/register/`; 
  private allUsersEndpoint = `${this.apiUrl}/all/`;
  private deactivateEndpoint = `${this.apiUrl}/deactivate-user/`;
  private reactivateEndpoint = `${this.apiUrl}/reactivate-user/`; 
  private deleteEndpoint = `${this.apiUrl}/delete-user/`;


  constructor(private http: HttpClient) { }

  /**
   * Registers a new user with all required fields.
   * @param userData - Username, password, and roleid
   * @returns Observable of the API response
   */
  registerUser(userData: UserRegistrationData): Observable<any> {
    const payload = {
        username: userData.username,
        password: userData.password,
        roleid: userData.roleid
    };
    
    return this.http.post<any>(this.registerEndpoint, payload);
  }

  /**
   * Fetches all users from the backend.
   * @returns Observable of an array of User objects.
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.allUsersEndpoint);
  }

  /**
   * Deactivates a user account.
   * @param userId - The ID of the user to deactivate.
   * @returns Observable of the API response.
   */
  deactivateUser(userId: string): Observable<any> {
    const payload = { userId: userId };
    return this.http.post<any>(this.deactivateEndpoint, payload);
  }

  /**
   * Reactivates a user account.
   * @param userId - The ID of the user to reactivate.
   * @returns Observable of the API response.
   */
  reactivateUser(userId: string): Observable<any> {
    const payload = { userId: userId };
    return this.http.post<any>(this.reactivateEndpoint, payload);
  }

  /**
   * Deletes a user account.
   * @param userId - The ID of the user to delete.
   * @returns Observable of the API response.
   */
  deleteUser(userId: string): Observable<any> {
    const payload = { userId: userId };
    return this.http.post<any>(this.deleteEndpoint, payload);
  }
}