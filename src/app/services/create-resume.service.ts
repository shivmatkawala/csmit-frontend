import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators'; 

// --- NEW INTERFACES for Setup Data ---
export interface SkillMaster {
  id: number;
  skillName: string;
}

export interface ProficiencyLevel {
  id: number;
  levelName: 'beginner' | 'intermediate' | 'proficient' | 'advanced' | 'expert' | string; // Possible names from API
}

// FIX: Aligned SetupData with the actual API response fields
export interface SetupData {
  techStacks: { tech_stackid: number, techname: string }[];
  skills: { skillmasterid: number, skillname: string, categoryid: number | null }[];
  proficiencies: { proficiencyid: number, levelname: string }[];
}
// --- END NEW INTERFACES ---


// Personal Info structure matching the API
interface PersonalInfo {
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone: string;
  linkedinId: string;
  githubId: string;
}

// Education item structure matching the API
interface EducationItem {
  qualification_type: string;
  qualification: string;
  joined_on: string;
  left_on: string | null;
  marks: string;
  marking_system: string;
  university: string;
}

// Experience item structure matching the API
interface ExperienceItem {
  position: string;
  company: string;
  joined_on: string;
  left_on: string | null;
  location: string;
  worked_on: string;
}

// Skill item structure matching the API
export interface SkillItem { // Exported for use in component
  skillMasterId: number;
  proficiencyId: number;
}

// Project Tech Stack structure (nested)
interface TechStackItem {
  tech_stackId: number;
}

// Project Description structure (nested)
interface DescriptionItem {
  description: string;
}

// Project item structure matching the API
interface ProjectItem {
  projectName: string;
  githubLink: string;
  techStack: TechStackItem[]; // Array of nested objects
  descriptions: DescriptionItem[]; // Array of nested objects
}

/**
 * The main API Payload structure, now strictly defined
 * to match the nested JSON sent from the component.
 */
export interface ApiPayload {
  userId: string;
  personalInfo: PersonalInfo;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
}

interface CreateResumeResponse {
  message: string;
  username: string;
  password: string;
  role_id: string;
  user_id: string; // Assuming API returns the user_id upon creation
}

// FIX: Simplified StudentInfo structure for Resume Display component
export interface StudentInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string; // Added location for ATS view
  linkedin: string;
  portfolio: string;
  experience_type: 'Fresher' | 'Intern' | 'Experienced';
  education: { degree: string, institution: string, start_year: number, end_year: number | null, grade: string }[];
  experience: { title: string, company: string, start_date: string, end_date: string | null, description: string }[];
  skills: { name: string, level?: string }[]; // Added level just in case, but name is main for ATS
  projects: { title: string, duration: string, role: string, url: string, description: string, tech_used: string }[];
}

// --- New Interfaces for Add operations ---
interface AddSkillResponse {
    message: string;
    skill_master_id: number;
    skill_name: string;
}

interface AddProficiencyResponse {
    message: string;
    proficiency_id: number;
    level_name: string;
}

interface AddTechstackResponse {
    message: string;
    tech_stack_id: number;
    tech_stack_name: string;
}
// --- End New Interfaces ---


@Injectable({
  providedIn: 'root'
})
export class ResumeService {
  
  // Base URLs defined as requested
  private CREATE_RESUME_URL = 'http://127.0.0.1:8000/api/resume/create-resume/';
  private GET_RESUME_URL = 'http://127.0.0.1:8000/api/resume/get-resume/'; 
  private SETUP_DATA_URL = 'http://127.0.0.1:8000/api/resume/setup-data/'; 
  
  // FIX: Added URLs for adding new skills, proficiencies, and techstacks
  private ADD_SKILL_URL = 'http://127.0.0.1:8000/api/resume/add-skill/';
  private ADD_PROFICIENCY_URL = 'http://127.0.0.1:8000/api/resume/add-proficiency/';
  private ADD_TECHSTACK_URL = 'http://127.0.0.1:8000/api/resume/add-techstack/'; 
  
  private http = inject(HttpClient);
  
  /**
   * Fetches the necessary setup data (skills, proficiency levels, etc.) from the backend.
   * @returns Observable of the SetupData.
   */
  getSetupData(): Observable<SetupData> {
      console.log('Fetching Setup Data (Skills/Proficiency) from:', this.SETUP_DATA_URL);
      return this.http.get<SetupData>(this.SETUP_DATA_URL);
  }

  /**
   * Submits the resume data payload to the backend API.
   * @param payload The structured resume data.
   * @returns Observable of the API response.
   */
  submitResume(payload: ApiPayload): Observable<CreateResumeResponse> {
    console.log('Posting Resume data to:', this.CREATE_RESUME_URL, 'Payload:', payload);
    return this.http.post<CreateResumeResponse>(this.CREATE_RESUME_URL, payload);
  }
  
  /**
   * Fetches the student's complete resume information from the backend.
   * @param userId The ID of the student to fetch the resume for (e.g., USR006).
   * @returns Observable of the StudentInfo data.
   */
  getResumeData(userId: string): Observable<StudentInfo> {
    // FIX: Using USR006 as a placeholder for the live API call based on the provided example.
    const fetchUrl = `${this.GET_RESUME_URL}${userId}/`; 
    console.log('Fetching Resume data from:', fetchUrl);
    
    // IMPORTANT: Adding catchError to explicitly return an empty object/null on 404/error, 
    // which the components handle as "no resume data found."
    return this.http.get<StudentInfo>(fetchUrl).pipe(
      catchError(error => {
        if (error.status === 404) {
          console.warn(`Resume data not found (404) for user ${userId}.`);
          // Return an Observable of a specific structure that indicates no data
          return of({ 
             full_name: 'Not Found', email: '', phone: '', location: '', linkedin: '', portfolio: '', experience_type: 'Fresher',
             education: [], experience: [], skills: [], projects: []
          } as StudentInfo); 
        }
        console.error('Error fetching resume data:', error);
        return of({ 
             full_name: 'Error', email: '', phone: '', location: '', linkedin: '', portfolio: '', experience_type: 'Fresher',
             education: [], experience: [], skills: [], projects: []
          } as StudentInfo); 
      })
    );
  }

  /**
   * Adds a new skill master to the database if it doesn't exist.
   * @param skillName The name of the skill to add.
   * @returns Observable of the AddSkillResponse.
   */
  addSkill(skillName: string): Observable<AddSkillResponse> {
      console.log('Adding new skill:', skillName);
      return this.http.post<AddSkillResponse>(this.ADD_SKILL_URL, { skillName: skillName }).pipe(
          tap(res => console.log('Skill added successfully:', res)),
          catchError(err => {
              console.error('Error adding skill:', err);
              throw err; 
          })
      );
  }

  /**
   * Adds a new proficiency level to the database if it doesn't exist.
   * @param levelName The name of the proficiency level to add.
   * @returns Observable of the AddProficiencyResponse.
   */
  addProficiency(levelName: string): Observable<AddProficiencyResponse> {
      console.log('Adding new proficiency:', levelName);
      return this.http.post<AddProficiencyResponse>(this.ADD_PROFICIENCY_URL, { levelName: levelName }).pipe(
          tap(res => console.log('Proficiency added successfully:', res)),
          catchError(err => {
              console.error('Error adding proficiency:', err);
              throw err;
          })
      );
  }

  /**
   * Adds a new tech stack entry to the database if it doesn't exist.
   * @param techName The name of the tech stack to add.
   * @returns Observable of the AddTechstackResponse.
   */
  addTechStack(techName: string): Observable<AddTechstackResponse> {
      console.log('Adding new tech stack:', techName);
      // Assuming 'tech_stack_name' as the field for the POST request body
      return this.http.post<AddTechstackResponse>(this.ADD_TECHSTACK_URL, { tech_stack_name: techName }).pipe(
          tap(res => console.log('Tech Stack added successfully:', res)),
          catchError(err => {
              console.error('Error adding tech stack:', err);
              throw err;
          })
      );
  }
}