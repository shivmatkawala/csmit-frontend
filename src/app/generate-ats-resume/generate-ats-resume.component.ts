import { Component, OnInit, signal } from '@angular/core';
// FIX: ApiService से interfaces को सीधे ResumeService से उपयोग करें 
import { ResumeService, StudentInfo } from '../services/create-resume.service'; 
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-generate-ats-resume',
  templateUrl: './generate-ats-resume.component.html',
  styleUrls: ['./generate-ats-resume.component.css']
})
export class GenerateAtsResumeComponent implements OnInit{

  // Holds the main resume data structure.
  resumeData: StudentInfo | null = null; 
  
  // Variables to hold skills divided into two columns for better layout.
  skillColumn1: { name: string }[] = [];
  skillColumn2: { name: string }[] = [];

  // Signal to control the visibility of the action buttons (print, download).
  isButtonContainerVisible = signal(true); 

  // FIX: ApiService की जगह ResumeService का उपयोग करें
  constructor(
    private resumeService: ResumeService,
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.fetchResumeData();
  }
  
  /**
   * Fetches the student's resume data using the GET API.
   * FIX: Hardcoding 'USR006' as per your requirement, but ideally this comes from session/auth.
   */
  private fetchResumeData(): void {
      
    // FIX: Get the user ID from the session, default to 'USR006' as requested
    const userId = typeof window !== 'undefined' && window.sessionStorage.getItem('CURRENT_USER_ID') || 'USR006';
    
    // ResumeService का उपयोग करके GET API कॉल करें
    this.resumeService.getResumeData(userId).subscribe({
      next: (data: StudentInfo) => {
        this.resumeData = data; 
        this.divideSkillsIntoColumns(this.resumeData.skills); 
        console.log('Resume Data Fetched Successfully:', this.resumeData);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Failed to fetch resume data from API:', error);
        // Fallback: If API fails, try to load data stored during form submission
        this.loadFallbackData();
      }
    });
  }

  /**
   * Loads the fallback data saved during the create-student submission process.
   */
  private loadFallbackData(): void {
      if (typeof window !== 'undefined' && window.sessionStorage) {
          const storedData = window.sessionStorage.getItem('STUDENT_DATA');
          if (storedData) {
              const loginData = JSON.parse(storedData);
              if (loginData && loginData.info) {
                  this.resumeData = loginData.info;
                  if (this.resumeData) {
                      this.divideSkillsIntoColumns(this.resumeData.skills);
                  }
                  console.log('Resume Data Loaded from Fallback Storage:', this.resumeData);
                  return;
              }
          }
      }
      // If no data is found anywhere
      console.log('No resume data found, redirecting to creation page.');
      // In a production app, you would navigate: this.router.navigate(['/create-student']);
  }


  /**
   * Helper function to divide the skills array roughly in half for two-column display.
   * @param skills The array of skills.
   */
  private divideSkillsIntoColumns(skills: any[]): void {
    if (skills && skills.length > 0) {
      const middleIndex = Math.ceil(skills.length / 2);
      this.skillColumn1 = skills.slice(0, middleIndex);
      this.skillColumn2 = skills.slice(middleIndex);
    } else {
        this.skillColumn1 = [];
        this.skillColumn2 = [];
    }
  }

  /**
   * Generates a comma-separated string of skill names for use in the summary.
   * @returns A string containing all skill names separated by commas.
   */
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
  downloadResume(): void {
    // #resume-content is the outer container. We target it.
    const resumeElement = document.getElementById('resume-content'); 
    if (!resumeElement) return;

    // Dynamically load the html2pdf library.
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
        // html2pdf is available after the script loads.
        this.generatePdf(resumeElement);
    };
    document.body.appendChild(script);
  }

  /**
   * Generates the PDF using html2pdf with configurations optimized for A4 full-page output.
   * @param resumeElement The HTMLElement containing the resume content.
   */
  private generatePdf(resumeElement: HTMLElement): void {
     const html2pdf = (window as any).html2pdf;
     if (!html2pdf) return;
     
     
     const originalBodyMargin = document.body.style.margin;
     const originalBodyOverflow = document.body.style.overflow;

     // Temporarily remove body margin and hide scrollbars to ensure edge-to-edge rendering
     document.body.style.margin = '0';
     document.body.style.overflow = 'hidden';

    // Configuration for html2pdf
    const opt: any = { 
        margin: 0, 
        filename: `${this.resumeData?.full_name?.replace(' ', '_') || 'Student'}_ATS_Resume.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, // Increased scale for even better resolution
          logging: false, 
          dpi: 300, 
          letterRendering: true,
          useCORS: true,
          ignoreElements: (element: HTMLElement) => element.classList.contains('print-hidden')
        }, 
        jsPDF: { 
          // Changed unit to 'mm' for more standard paper size control.
          unit: 'mm', 
          // Explicitly set A4 dimensions to ensure the page size is correct
          format: [210, 297], // A4 size in mm (210x297)
          orientation: 'portrait' 
        },
        pagebreak: { 
         
          mode: 'css' 
        }
    };
    
    
    html2pdf().from(resumeElement).set(opt).save().then(() => {
        // Restore original body styles after PDF generation is complete
        document.body.style.margin = originalBodyMargin;
        document.body.style.overflow = originalBodyOverflow;
    });
  }

}
