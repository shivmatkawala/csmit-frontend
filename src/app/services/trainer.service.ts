import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TrainerFormData {
  id: string; 
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courses: string[];
  experienceYears: number | null;
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

// ✅ FIXED: Hardcoded IP hata diya hai taaki Proxy/Ngrok ke sath chale
const API_BASE_URL = '/api/trainers/';

@Injectable({
  providedIn: 'root'
})
export class TrainerApiService {

  constructor(private http: HttpClient) { }

  private transformToPayload(data: TrainerFormData): TrainerApiPayload {
    const experienceYears = data.experienceYears ?? 0;

    return {
      csmit_id: data.id,
      full_name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      courses: data.courses,
      experience_years: experienceYears,
      image_url: data.imageUrl,
    };
  }
  
  private transformFromApi(apiData: any): TrainerFormData {
      const parts = apiData.full_name ? apiData.full_name.split(' ') : [];
      const lastName = parts.length > 1 ? parts.pop() || '' : ''; 
      const firstName = parts.join(' '); 

      return {
          id: apiData.csmit_id,
          firstName: firstName,
          lastName: lastName,
          email: apiData.email,
          phone: apiData.phone,
          courses: apiData.courses || [],
          experienceYears: apiData.experience_years, 
          imageUrl: apiData.image_url,              
      };
  }

  getTrainers(): Observable<TrainerFormData[]> {
    return this.http.get<any[]>(API_BASE_URL).pipe(
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