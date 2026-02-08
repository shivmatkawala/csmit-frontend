import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators'; 

// --- INTERFACES ---
export interface SkillMaster { id: number; skillName: string; }
export interface ProficiencyLevel { id: number; levelName: string; }

export interface SetupData {
  techStacks: { tech_stackid: number, techname: string }[];
  skills: { skillmasterid: number, skillname: string, categoryid: number | null }[];
  proficiencies: { proficiencyid: number, levelname: string }[];
}

export interface ApiPayload {
  userId: string;
  personalInfo: any;
  education: any[];
  experience: any[];
  skills: any[];
  projects: any[];
}

export interface StudentInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  experience_type: string;
  education: any[];
  experience: any[];
  skills: any[];
  projects: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  
  private http = inject(HttpClient);

  private BASE_RESUME_URL = '/api/resume/';
  
  private CREATE_RESUME_URL = `${this.BASE_RESUME_URL}create-resume/`;
  private GET_RESUME_URL = `${this.BASE_RESUME_URL}get-resume/`; 
  private SETUP_DATA_URL = `${this.BASE_RESUME_URL}setup-data/`; 
  
  private ADD_SKILL_URL = `${this.BASE_RESUME_URL}add-skill/`;
  private ADD_PROFICIENCY_URL = `${this.BASE_RESUME_URL}add-proficiency/`;
  private ADD_TECHSTACK_URL = `${this.BASE_RESUME_URL}add-techstack/`; 

  getSetupData(): Observable<SetupData> {
      return this.http.get<SetupData>(this.SETUP_DATA_URL);
  }

  submitResume(payload: ApiPayload): Observable<any> {
    return this.http.post<any>(this.CREATE_RESUME_URL, payload);
  }
  
  getResumeData(userId: string): Observable<StudentInfo> {
    const fetchUrl = `${this.GET_RESUME_URL}${userId}/`; 
    
    return this.http.get<StudentInfo>(fetchUrl).pipe(
      catchError(error => {
        const emptyData: StudentInfo = { 
          full_name: 'Not Found', email: '', phone: '', location: '', linkedin: '', 
          portfolio: '', experience_type: 'Fresher', education: [], 
          experience: [], skills: [], projects: [] 
        };
        return of(emptyData);
      })
    );
  }

  // FIX: Serializers expect lowercase keys ('skillname', 'techname', 'levelname')
  addSkill(skillName: string): Observable<any> {
      return this.http.post<any>(this.ADD_SKILL_URL, { skillname: skillName });
  }

  addProficiency(levelName: string): Observable<any> {
      return this.http.post<any>(this.ADD_PROFICIENCY_URL, { levelname: levelName });
  }

  addTechStack(techName: string): Observable<any> {
      return this.http.post<any>(this.ADD_TECHSTACK_URL, { techname: techName });
  }
}