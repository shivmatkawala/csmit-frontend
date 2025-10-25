import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// --- Interfaces ---

// Admin Data Interface (Frontend's internal structure)
interface AdminFormData {
  id: string; // Used internally
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  experienceYears: number | null; // Can be null in form
  imageUrl: string;
}

// Admin API Payload (Backend's expected structure - snake_case)
interface AdminApiPayload {
    csmit_id: string; // Assuming API uses csmit_id for identification
    full_name: string;
    email: string;
    phone: string;
    experience_years: number; // Backend key
    image_url: string;         // Backend key
}

const API_BASE_URL = 'http://127.0.0.1:8000/api/admins/';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {

  constructor(private http: HttpClient) { }

  /**
   * Transforms internal AdminFormData to the backend's expected AdminApiPayload.
   * Handles combining names and converting field keys (camelCase -> snake_case).
   */
  private transformToPayload(data: AdminFormData): AdminApiPayload {
    // Ensure experienceYears is a number, default to 0 if null/undefined.
    const experienceYears = data.experienceYears ?? 0;

    return {
      csmit_id: data.id, // Using internal 'id' as 'csmit_id'
      full_name: `${data.firstName} ${data.lastName}`, // Combine names
      email: data.email,
      phone: data.phone,
      experience_years: experienceYears, // Backend key
      image_url: data.imageUrl,         // Backend key
    };
  }
  
  /**
   * Transforms API response data back to the internal AdminFormData structure.
   */
  private transformFromApi(apiData: any): AdminFormData {
      // Assuming apiData.full_name is "FirstName LastName"
      const parts = apiData.full_name ? apiData.full_name.full_name.split(' ') : [];
      // Split logic (gets the last word as last name, rest as first name)
      const lastName = parts.length > 1 ? parts.pop() || '' : ''; 
      const firstName = parts.join(' '); 

      return {
          id: apiData.csmit_id, // Use csmit_id as the internal ID
          firstName: firstName,
          lastName: lastName,
          email: apiData.email,
          phone: apiData.phone,
          experienceYears: apiData.experience_years, 
          imageUrl: apiData.image_url,              
      };
  }

  // --- CRUD Operations ---
  
  // GET: Fetch all admins (Trainer 405 error को ध्यान में रखते हुए, इसे सिर्फ़ रखा गया है)
  getAdmins(): Observable<AdminFormData[]> {
    return this.http.get<any[]>(API_BASE_URL).pipe(
        map(apiDataArray => apiDataArray.map(data => this.transformFromApi(data)))
    );
  }

  // POST: Create a new admin
  createAdmin(adminData: AdminFormData): Observable<any> {
    const payload = this.transformToPayload(adminData);
    console.log('Admin POST Payload:', payload); // Debugging
    return this.http.post<any>(API_BASE_URL, payload);
  }

  // PUT: Update an existing admin
  updateAdmin(adminData: AdminFormData): Observable<any> {
    const payload = this.transformToPayload(adminData);
    const url = `${API_BASE_URL}${adminData.id}/`; // Assuming API endpoint for update is /api/admins/{id}/
    return this.http.put<any>(url, payload); 
  }

  // DELETE: Delete an admin
  deleteAdmin(adminId: string): Observable<any> {
    const url = `${API_BASE_URL}${adminId}/`;
    return this.http.delete<any>(url);
  }
}

// Export the interface for use in the component
export { AdminFormData as Admin };
