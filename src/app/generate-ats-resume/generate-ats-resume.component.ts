import { Component, OnInit, signal, Input } from '@angular/core';
import { ResumeService, StudentInfo } from '../services/create-resume.service'; 
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-generate-ats-resume',
  templateUrl: './generate-ats-resume.component.html',
  styleUrls: ['./generate-ats-resume.component.css']
})
export class GenerateAtsResumeComponent implements OnInit{

  @Input() isDashboardEmbed: boolean = false; 

  resumeData: StudentInfo | null = null; 
  
  skillColumn1: { name: string, level?: string }[] = [];
  skillColumn2: { name: string, level?: string }[] = [];
  isButtonContainerVisible = signal(true); 
  
  isLoading = signal(true);

  constructor(
    private resumeService: ResumeService,
    private router: Router,
    private apiService: ApiService 
  ) {}

  ngOnInit(): void {
    this.fetchResumeData();
  }

  private fetchResumeData(): void {
    const loginData = this.apiService.getStoredStudentData();
    const userId = loginData?.userId;
    
    console.log('Resume Component: Attempting to fetch resume for userId:', userId); 

    if (!userId) {
        console.error('Session ID not found. Cannot fetch resume. Redirecting to dashboard.');
        this.isLoading.set(false);
        this.backToDashboard(); 
        return;
    }
    
    // Attempt 1: Fetch from API
    this.resumeService.getResumeData(userId).subscribe({
      next: (apiResponse: any) => {
        this.isLoading.set(false);
        
        // --- FIX STARTS HERE: Transform API Data to Component Format ---
        if (apiResponse && (apiResponse.firstName || apiResponse.full_name)) {
            
            // Transform the raw API response into the structure our HTML expects
            this.resumeData = this.transformApiData(apiResponse);
            
            this.divideSkillsIntoColumns(this.resumeData.skills); 
            console.log('Resume Data Fetched & Transformed Successfully:', this.resumeData.full_name);
            
            if (this.isDashboardEmbed) {
                this.downloadResume();
            }
        } else {
            console.warn('Resume data missing from API. Attempting fallback.');
            this.loadFallbackData(userId); 
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        console.error('Failed to fetch resume data from API. Trying fallback.', error);
        this.loadFallbackData(userId);
      }
    });
  }

  // --- NEW FUNCTION: Maps API JSON to Resume UI Structure ---
  private transformApiData(data: any): StudentInfo {
    return {
        // Name: Combine First + Last if full_name is missing
        full_name: data.full_name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        
        email: data.email || '',
        phone: data.phone || '',
        
        // Location: Check address or location fields
        location: data.location || data.address || '',
        
        // Links: Construct full URLs if only IDs are provided
        linkedin: data.linkedin || (data.linkedinId ? `https://linkedin.com/in/${data.linkedinId}` : ''),
        portfolio: data.portfolio || (data.githubId ? `https://github.com/${data.githubId}` : ''),
        
        // Experience Type: Default to Fresher if missing
        experience_type: data.experience_type || (data.experience && data.experience.length > 0 ? 'Experienced' : 'Fresher'),
        
        // Map Education Array
        education: (data.education || []).map((edu: any) => ({
            degree: edu.degree || edu.qualification || '', // Map 'qualification' to 'degree'
            institution: edu.institution || edu.university || '', // Map 'university' to 'institution'
            // Extract Year from Date (YYYY-MM-DD -> YYYY)
            start_year: edu.start_year || (edu.joined_on ? edu.joined_on.substring(0, 4) : ''),
            end_year: edu.end_year || (edu.left_on ? edu.left_on.substring(0, 4) : 'Present'),
            grade: edu.grade || (edu.marks ? `${edu.marks} ${edu.marking_system || ''}` : '')
        })),

        // Map Experience Array
        experience: (data.experience || []).map((exp: any) => ({
            title: exp.title || exp.position || '', // Map 'position' to 'title'
            company: exp.company || '',
            start_date: exp.start_date || (exp.joined_on ? exp.joined_on.substring(0, 7) : ''), // YYYY-MM
            end_date: exp.end_date || (exp.left_on ? exp.left_on.substring(0, 7) : 'Present'),
            description: exp.description || exp.worked_on || '' // Map 'worked_on' to 'description'
        })),

        // Map Skills Array
        skills: (data.skills || []).map((skill: any) => ({
            name: skill.name || skill.skillName || '', // Map 'skillName' to 'name'
            level: skill.level || skill.proficiency || '' // Map 'proficiency' to 'level'
        })),

        // Map Projects Array - This handles the nested techStack/descriptions
        projects: (data.projects || []).map((proj: any) => ({
            title: proj.title || proj.projectName || '',
            url: proj.url || proj.githubLink || '',
            // Join Tech Stack Array into a single string
            tech_used: proj.tech_used || (Array.isArray(proj.techStack) ? proj.techStack.map((t: any) => t.techName).join(', ') : ''),
            // Join Description Array into a single string
            description: proj.description || (Array.isArray(proj.descriptions) ? proj.descriptions.map((d: any) => d.description).join('. ') : '')
        }))
    };
  }

  private loadFallbackData(userId: string): void {
      if (typeof window !== 'undefined' && window.localStorage) {
          const storedData = window.localStorage.getItem('STUDENT_DATA') || window.sessionStorage.getItem('STUDENT_DATA');
          if (storedData) {
              const loginData = JSON.parse(storedData);
              // Check if we have data structure from Setup form (which matches API structure mostly)
              // We run it through the same transformer to be safe
              const rawInfo = loginData.info || loginData;
              
              if (rawInfo && (rawInfo.education?.length > 0 || rawInfo.firstName)) {
                  this.resumeData = this.transformApiData(rawInfo); // USE TRANSFORMER HERE TOO
                  
                  this.divideSkillsIntoColumns(this.resumeData.skills);
                  console.log('Resume Data Loaded and Transformed from Storage.');
                  this.isLoading.set(false);
                  
                  if (this.isDashboardEmbed) {
                      this.downloadResume();
                  }
                  return; 
              }
          }
      }
      
      console.error('Resume data is not complete or not found. Redirecting.');
      this.isLoading.set(false);
      window.location.href = 'setup-profile'; 
  }

  private divideSkillsIntoColumns(skills: { name: string, level?: string }[]): void {
    if (skills && skills.length > 0) {
      const middleIndex = Math.ceil(skills.length / 2);
      this.skillColumn1 = skills.slice(0, middleIndex);
      this.skillColumn2 = skills.slice(middleIndex);
    } else {
        this.skillColumn1 = [];
        this.skillColumn2 = [];
    }
  }

  getSkillNames(): string {
    if (this.resumeData && this.resumeData.skills && this.resumeData.skills.length > 0) {
        return this.resumeData.skills.map(s => s.name).join(', ');
    }
    return '';
  }

  toggleButtonContainer(): void {
      this.isButtonContainerVisible.update(visible => !visible);
  }

  printResume(): void {
    window.print();
  }
  
  backToDashboard(): void {
      window.location.href = 'student-dashboard';
  }
  
  downloadResume(): void {
    const resumeElement = document.getElementById('resume-content'); 
    if (!resumeElement) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
        this.generatePdf(resumeElement);
    };
    document.body.appendChild(script);
  }

  private generatePdf(resumeElement: HTMLElement): void {
     const html2pdf = (window as any).html2pdf;
     if (!html2pdf) return;
     
     const originalBodyMargin = document.body.style.margin;
     const originalBodyOverflow = document.body.style.overflow;

     document.body.style.margin = '0';
     document.body.style.overflow = 'hidden';

    const opt: any = { 
        margin: 0, 
        filename: `${this.resumeData?.full_name?.replace(' ', '_') || 'Student'}_ATS_Resume.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          logging: false, 
          dpi: 300, 
          letterRendering: true,
          useCORS: true,
          ignoreElements: (element: HTMLElement) => element.classList.contains('print-hidden')
        }, 
        jsPDF: { 
          unit: 'mm', 
          format: [210, 297],
          orientation: 'portrait' 
        },
        pagebreak: { mode: 'css' }
    };
    
    html2pdf().from(resumeElement).set(opt).save().then(() => {
        document.body.style.margin = originalBodyMargin;
        document.body.style.overflow = originalBodyOverflow;
        
        if (this.isDashboardEmbed) {
             if (typeof window.alert === 'function') {
                 // Optional: Alert user
             }
        }
    });
  }
}
