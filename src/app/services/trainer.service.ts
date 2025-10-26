import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
interface TrainerFormData {
  id: string; 
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courses: string[];
  experienceYears: number | null; // Can be null in form, but converted to 0 for API
  imageUrl: string;
}


interface TrainerApiPayload {
    csmit_id: string;
    full_name: string;
    email: string;
    phone: string;
    courses: string[];
    experience_years: number; 
    image_url: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api/trainers/';

@Injectable({
  providedIn: 'root'
})
export class TrainerApiService {

  constructor(private http: HttpClient) { }

 
  private transformToPayload(data: TrainerFormData): TrainerApiPayload {
    // Ensure experienceYears is not null, default to 0 if it is.
    const experienceYears = data.experienceYears ?? 0;

    return {
      csmit_id: data.id, // We use the internal 'id' (which holds the CSMIT-TRAINER-XXX value)
      full_name: `${data.firstName} ${data.lastName}`, // Combine names
      email: data.email,
      phone: data.phone,
      courses: data.courses,
      experience_years: experienceYears, // Backend key
      image_url: data.imageUrl,         // Backend key
    };
  }
  
  
  private transformFromApi(apiData: any): TrainerFormData {
      // Assuming apiData.full_name is "FirstName LastName"
      const parts = apiData.full_name ? apiData.full_name.split(' ') : [];
      // Split logic (gets the last word as last name, rest as first name)
      const lastName = parts.length > 1 ? parts.pop() || '' : ''; 
      const firstName = parts.join(' '); 

      return {
          id: apiData.csmit_id, // Use csmit_id as the internal ID for consistency
          firstName: firstName,
          lastName: lastName,
          email: apiData.email,
          phone: apiData.phone,
          courses: apiData.courses || [],
          experienceYears: apiData.experience_years, 
          imageUrl: apiData.image_url,              
      };
  }

 

  // GET: Fetch all trainers
  // Note: Since the backend might return a list of trainers, we return Observable<TrainerFormData[]>
  getTrainers(): Observable<TrainerFormData[]> {
    // In a real scenario, this endpoint might need adjustment if it doesn't return all trainers.
    // For now, we assume it returns a list of all trainers.
    return this.http.get<any[]>(API_BASE_URL).pipe(
        // Map the array of API objects to an array of internal TrainerFormData objects
        map(apiDataArray => apiDataArray.map(data => this.transformFromApi(data)))
    );
  }

  
  createTrainer(trainerData: TrainerFormData): Observable<any> {
    const payload = this.transformToPayload(trainerData);
   
    return this.http.post<any>(API_BASE_URL, payload);
  }

  
  updateTrainer(trainerData: TrainerFormData): Observable<any> {
    const payload = this.transformToPayload(trainerData);
    
    const url = `${API_BASE_URL}${trainerData.id}/`; 
    return this.http.put<any>(url, payload); 
  }

  
  deleteTrainer(csmitId: string): Observable<any> {
    
    const url = `${API_BASE_URL}${csmitId}/`;
    return this.http.delete<any>(url);
  }
}


export { TrainerFormData as Trainer };
