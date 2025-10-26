import { Component, OnInit, signal } from '@angular/core';
import { ApiService, StudentInfo, LoginResponse } from '../services/api.service'; 
import { Router } from '@angular/router';

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

  constructor(
    private apiService: ApiService,
    private router: Router 
  ) {}

  ngOnInit(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    
    if (loginData && loginData.info) {
      // Use the 'info' object which contains all resume-related data.
      this.resumeData = loginData.info; 
      
      // Divide skills into two columns for presentation.
      this.divideSkillsIntoColumns(this.resumeData.skills); 

      console.log('Resume Data Loaded:', this.resumeData);
    } else {
      console.log('No login data found, redirecting to dashboard');
      // In a production app, you would navigate: this.router.navigate(['/dashboard']);
    }
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

  /**
   * Toggles the visibility of the action buttons container.
   */
  toggleButtonContainer(): void {
      this.isButtonContainerVisible.update(visible => !visible);
  }

  /**
   * Triggers the default browser print function.
   */
  printResume(): void {
    window.print();
  }

  /**
   * Dynamically loads html2pdf and initiates the PDF generation.
   */
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
     
     // Store original body styles
     const originalBodyMargin = document.body.style.margin;
     const originalBodyOverflow = document.body.style.overflow;

     // Temporarily remove body margin and hide scrollbars to ensure edge-to-edge rendering
     document.body.style.margin = '0';
     document.body.style.overflow = 'hidden';

    // Configuration for html2pdf
    const opt: any = { 
        // FIX: Setting margin to 0 for full bleed control via CSS 
        margin: 0, 
        filename: `${this.resumeData?.full_name?.replace(' ', '_') || 'Student'}_ATS_Resume.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, // Increased scale for even better resolution
          logging: false, 
          dpi: 300, 
          letterRendering: true,
          useCORS: true,
          // FIX: फिक्स्ड windowHeight/Width/scrollY/scrollX को हटा दिया गया है
          // ताकि html2pdf मल्टी-पेज कंटेंट को बिना काटे कैप्चर कर सके।
          // अब यह कंटेंट की वास्तविक ऊँचाई के अनुसार चलेगा।
          // ignoreElements with print-hidden class during canvas capture
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
          // FIX: 'avoid-all' को 'css' में बदल दिया गया है ताकि CSS में परिभाषित 
          // 'page-break-inside: avoid' का पालन हो और कंटेंट न कटे।
          mode: 'css' 
        }
    };
    
    // Generate PDF and then restore original body styles
    // We target the outer #resume-content element
    html2pdf().from(resumeElement).set(opt).save().then(() => {
        // Restore original body styles after PDF generation is complete
        document.body.style.margin = originalBodyMargin;
        document.body.style.overflow = originalBodyOverflow;
    });
  }

}
