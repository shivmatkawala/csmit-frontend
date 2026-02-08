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
    
    if (!userId) {
        this.isLoading.set(false);
        this.backToDashboard(); 
        return;
    }
    
    this.resumeService.getResumeData(userId).subscribe({
      next: (apiResponse: any) => {
        this.isLoading.set(false);
        if (apiResponse && (apiResponse.firstName || apiResponse.full_name)) {
            this.resumeData = this.transformApiData(apiResponse);
            this.divideSkillsIntoColumns(this.resumeData.skills); 
            if (this.isDashboardEmbed) this.downloadResume();
        } else {
            this.loadFallbackData(userId); 
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.loadFallbackData(userId);
      }
    });
  }

  // --- ROBUST DATA TRANSFORMER ---
  private transformApiData(data: any): StudentInfo {
    
    // 1. Deduplicate Skills
    const rawSkills = data.skills || [];
    const uniqueSkillsMap = new Map();
    rawSkills.forEach((skill: any) => {
        const name = skill.name || skill.skillName || '';
        if (name && !uniqueSkillsMap.has(name.toLowerCase())) {
            uniqueSkillsMap.set(name.toLowerCase(), {
                name: name,
                level: skill.level || skill.proficiency || ''
            });
        }
    });
    const cleanedSkills = Array.from(uniqueSkillsMap.values());

    return {
        full_name: data.full_name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email || '',
        phone: data.phone || '',
        location: data.location || data.address || '',
        linkedin: data.linkedin || (data.linkedinId ? `https://linkedin.com/in/${data.linkedinId}` : ''),
        portfolio: data.portfolio || (data.githubId ? `https://github.com/${data.githubId}` : ''),
        experience_type: data.experience_type || (data.experience && data.experience.length > 0 ? 'Experienced' : 'Fresher'),
        
        education: (data.education || []).map((edu: any) => ({
            degree: edu.degree || edu.qualification || '', 
            institution: edu.institution || edu.university || '', 
            start_year: edu.start_year || (edu.joined_on ? edu.joined_on.substring(0, 4) : ''),
            end_year: edu.end_year || (edu.left_on ? edu.left_on.substring(0, 4) : 'Present'),
            grade: edu.grade || (edu.marks ? `${edu.marks} ${edu.marking_system || ''}` : '')
        })),

        // 2. Fix [object Object] in Experience using recursive helper
        experience: (data.experience || []).map((exp: any) => {
            const rawDesc = exp.description || exp.worked_on || '';
            const cleanDesc = this.extractTextFromAny(rawDesc); // Use helper function

            return {
                title: exp.title || exp.position || '', 
                company: exp.company || '',
                start_date: exp.start_date || (exp.joined_on ? exp.joined_on.substring(0, 7) : ''), 
                end_date: exp.end_date || (exp.left_on ? exp.left_on.substring(0, 7) : 'Present'),
                description: cleanDesc
            };
        }),

        skills: cleanedSkills,

        // 3. Fix [object Object] in Projects using recursive helper
        projects: (data.projects || []).map((proj: any) => {
            const rawDesc = proj.description || proj.descriptions || '';
            const cleanDesc = this.extractTextFromAny(rawDesc);

            const rawTech = proj.tech_used || proj.techStack || '';
            const cleanTech = this.extractTextFromAny(rawTech, 'techName'); // Prioritize techName key

            return {
                title: proj.title || proj.projectName || '',
                url: proj.url || proj.githubLink || '',
                tech_used: cleanTech,
                description: cleanDesc
            };
        })
    };
  }

  /**
   * 🔥 SUPER ROBUST HELPER FUNCTION 🔥
   * Recursively extracts text strings from nested JSON/Arrays/Objects.
   * This guarantees that [object Object] is never shown.
   */
  private extractTextFromAny(val: any, preferredKey: string = ''): string {
    if (val === null || val === undefined) return '';
    
    // 1. Handle String
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // Check if it looks like JSON array or object and parse it
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                const parsed = JSON.parse(trimmed);
                return this.extractTextFromAny(parsed, preferredKey);
            } catch (e) {
                // Ignore parse errors, treat as string
            }
        }
        // If the string itself is literally "[object Object]", return empty to hide ugliness
        if (trimmed === '[object Object]') return '';
        return trimmed;
    }

    // 2. Handle Array (Join all items)
    if (Array.isArray(val)) {
        return val.map(item => this.extractTextFromAny(item, preferredKey))
                  .filter(s => s && s.trim().length > 0)
                  .join('. ');
    }

    // 3. Handle Object (Search for known keys)
    if (typeof val === 'object') {
        // Try preferred key first
        if (preferredKey && val[preferredKey]) {
             return this.extractTextFromAny(val[preferredKey]);
        }

        // Try standard keys known to be used in DB
        const knownKeys = ['worked_on', 'description', 'descriptions', 'techName', 'name', 'techname', 'title', 'detail'];
        for (const key of knownKeys) {
            if (val[key]) return this.extractTextFromAny(val[key]);
        }

        // FALLBACK: If no known key matches, join ALL string values found in the object
        // This handles cases where key might be 'desc' or 'summary' etc.
        const allValues = Object.values(val)
            .map(v => this.extractTextFromAny(v)) // Recurse
            .filter(s => s && s.length > 0 && s !== '[object Object]');
        
        if (allValues.length > 0) return allValues.join('. ');
        
        return '';
    }

    return String(val);
  }

  private loadFallbackData(userId: string): void {
      if (typeof window !== 'undefined' && window.localStorage) {
          const storedData = window.localStorage.getItem('STUDENT_DATA') || window.sessionStorage.getItem('STUDENT_DATA');
          if (storedData) {
              const loginData = JSON.parse(storedData);
              const rawInfo = loginData.info || loginData;
              if (rawInfo && (rawInfo.education?.length > 0 || rawInfo.firstName)) {
                  this.resumeData = this.transformApiData(rawInfo); 
                  this.divideSkillsIntoColumns(this.resumeData.skills);
                  this.isLoading.set(false);
                  if (this.isDashboardEmbed) this.downloadResume();
                  return; 
              }
          }
      }
      this.isLoading.set(false);
      window.location.href = 'setup-profile'; 
  }

  private divideSkillsIntoColumns(skills: { name: string, level?: string }[]): void {
    if (skills && skills.length > 0) {
      const middleIndex = Math.ceil(skills.length / 2);
      this.skillColumn1 = skills.slice(0, middleIndex);
      this.skillColumn2 = skills.slice(middleIndex);
    } else {
        this.skillColumn1 = []; this.skillColumn2 = [];
    }
  }

  getSkillNames(): string {
    if (this.resumeData && this.resumeData.skills && this.resumeData.skills.length > 0) {
        return this.resumeData.skills.map(s => s.name).join(', ');
    }
    return '';
  }

  toggleButtonContainer(): void { this.isButtonContainerVisible.update(visible => !visible); }
  printResume(): void { window.print(); }
  backToDashboard(): void { window.location.href = 'student-dashboard'; }
  
  downloadResume(): void {
    const resumeElement = document.getElementById('resume-content'); 
    if (!resumeElement) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => { this.generatePdf(resumeElement); };
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
        html2canvas: { scale: 2, logging: false, dpi: 300, letterRendering: true, useCORS: true, ignoreElements: (element: HTMLElement) => element.classList.contains('print-hidden')}, 
        jsPDF: { unit: 'mm', format: [210, 297], orientation: 'portrait' },
        pagebreak: { mode: 'css' }
    };
    html2pdf().from(resumeElement).set(opt).save().then(() => {
        document.body.style.margin = originalBodyMargin;
        document.body.style.overflow = originalBodyOverflow;
    });
  }
}