import { Component, OnInit, signal, Input } from '@angular/core';
import { ResumeService, StudentInfo } from '../services/create-resume.service'; 
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../services/api.service'; // Added ApiService to get stored data

@Component({
  selector: 'app-generate-ats-resume',
  templateUrl: './generate-ats-resume.component.html',
  styleUrls: ['./generate-ats-resume.component.css']
})
export class GenerateAtsResumeComponent implements OnInit{

  // NEW: Input property to know if this component is embedded in the dashboard
  @Input() isDashboardEmbed: boolean = false; 

  // Holds the main resume data structure.
  resumeData: StudentInfo | null = null; 
  
  // Variables to hold skills divided into two columns for better layout.
  skillColumn1: { name: string, level?: string }[] = [];
  skillColumn2: { name: string, level?: string }[] = [];

  // Signal to control the visibility of the action buttons (print, download).
  // FIX: Action buttons should be visible by default for dashboard view
  isButtonContainerVisible = signal(true); 
  
  // Track loading state for UI feedback
  isLoading = signal(true);

  constructor(
    private resumeService: ResumeService,
    private router: Router,
    private apiService: ApiService // Injected to access session data helper
  ) {}

  ngOnInit(): void {
    this.fetchResumeData();
  }
  
  /**
   * Fetches the student's resume data using the GET API.
   */
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
      next: (data: StudentInfo) => {
        this.isLoading.set(false);
        // Check if data is valid and not the 'Not Found' fallback structure from Service
        if (data && data.full_name && data.full_name !== 'Not Found' && data.education.length > 0) {
            this.resumeData = data; 
            this.divideSkillsIntoColumns(this.resumeData.skills); 
            console.log('Resume Data Fetched Successfully from API:', this.resumeData.full_name);
            
            // NEW: Automatically trigger download if embedded in dashboard
            if (this.isDashboardEmbed) {
                this.downloadResume();
            }
        } else {
            console.warn('Resume data missing from API. Attempting fallback from session storage.');
            this.loadFallbackData(userId); 
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading.set(false);
        console.error('Failed to fetch resume data from API. Trying fallback.', error);
        // Attempt 2: Fallback to local session storage
        this.loadFallbackData(userId);
      }
    });
  }

  /**
   * Loads the fallback data saved during the create-student submission process.
   * If valid data is found in sessionStorage, it sets it to resumeData and prevents redirection.
   */
  private loadFallbackData(userId: string): void {
      if (typeof window !== 'undefined' && window.sessionStorage) {
          const storedData = window.sessionStorage.getItem('STUDENT_DATA');
          if (storedData) {
              const loginData = JSON.parse(storedData);
              // Ensure we have the necessary nested info object and that it contains key data
              if (loginData && loginData.info && loginData.info.full_name && loginData.info.education.length > 0) {
                  
                  // NOTE: The fallback data structure already matches StudentInfo for display purposes
                  this.resumeData = loginData.info as StudentInfo; 
                  if (this.resumeData) {
                      this.divideSkillsIntoColumns(this.resumeData.skills);
                      console.log('Resume Data Loaded from Fallback Session Storage.');
                      this.isLoading.set(false);
                      
                      // NEW: Automatically trigger download if embedded in dashboard
                      if (this.isDashboardEmbed) {
                          this.downloadResume();
                      }
                      return; // SUCCESS: Found local data, do not redirect!
                  }
              }
          }
      }
      
      // FAILURE: No data found anywhere (API or Session)
      console.error('Resume data is not complete or not found in session. Redirecting to setup form.');
      this.isLoading.set(false);
      
      // Redirect to setup form, allowing the user to continue filling data
      window.location.href = 'create-student'; 
  }


  /**
   * Helper function to divide the skills array roughly in half for two-column display.
   * @param skills The array of skills.
   */
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
  
  /**
   * Redirects back to the student dashboard, or just navigates back to dashboard page if embedded.
   */
  backToDashboard(): void {
      // For a clean exit of the embedded component, we navigate to dashboard
      window.location.href = 'student-dashboard';
  }
  
  downloadResume(): void {
    const resumeElement = document.getElementById('resume-content'); 
    if (!resumeElement) return;

    // Dynamically load the html2pdf library.
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
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
        
        // If embedded, notify the user that the download has finished
        if (this.isDashboardEmbed) {
             // Replacing alert with console log and an internal message box is preferred, 
             // but since we don't have the parent's message box, a temporary notification is best.
             // window.alert is used here to ensure user sees the download confirmation.
             // If a custom modal system were available, it would be used instead of alert.
             if (typeof window.alert === 'function') {
                 window.alert(`✅ ${opt.filename} successfully downloaded!`);
             } else {
                 console.log(`✅ ${opt.filename} successfully downloaded!`);
             }
        }
    });
  }

}