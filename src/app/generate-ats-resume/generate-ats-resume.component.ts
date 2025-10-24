import { Component, OnInit } from '@angular/core';
// Student interface ki zaroorat nahi, ApiService se LoginResponse ka structure use hoga
import { ApiService, StudentInfo, LoginResponse } from '../services/api.service'; 
import { Router } from '@angular/router';
// html2pdf library dynamically load kiya jayega

@Component({
  selector: 'app-generate-ats-resume',
  templateUrl: './generate-ats-resume.component.html',
  styleUrls: ['./generate-ats-resume.component.css']
})
export class GenerateAtsResumeComponent implements OnInit{

  // Ab hum seedhe LoginResponse ke 'info' object ko use karenge
  resumeData: StudentInfo | null = null; 
  
  // Naye variables skills ko do columns mein baantne ke liye
  skillColumn1: { name: string }[] = [];
  skillColumn2: { name: string }[] = [];

  constructor(
    private apiService: ApiService,
    private router: Router 
  ) {}

  ngOnInit(): void {
    const loginData: LoginResponse | null = this.apiService.getStoredStudentData(); 
    
    if (loginData && loginData.info) {
      // 'info' object mein resume se related saara data hai, isko use karein
      this.resumeData = {
          ...loginData.info, 
          csmit_id: loginData.csmit_id // Main ID ko info object mein merge kiya
      };
      
      // Skills data ko do columns mein divide karein
      this.divideSkillsIntoColumns(this.resumeData.skills);

      console.log('Resume data loaded from stored login response:', this.resumeData);
    } else {
      console.error('Login data not found. Redirecting to dashboard.');
      this.router.navigate(['/student-dashboard']);
    }
  }

  // Helper function to divide skills array into two columns
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

  // HTML mein complex logic ko use karne ke liye ek helper function banaya gaya
  // Jisse skill names comma-separated string ban sake.
  getSkillNames(): string {
    if (this.resumeData && this.resumeData.skills.length > 0) {
        return this.resumeData.skills.map(s => s.name).join(', ');
    }
    return '';
  }

  printResume(): void {
    window.print();
  }

  downloadResume(): void {
    const resumeElement = document.getElementById('resume-content');
    if (!resumeElement) return;

    // Configuration for html2pdf
    const opt: any = { 
        margin: 0.5,
        filename: `${this.resumeData?.full_name?.replace(' ', '_') || 'Student'}_ATS_Resume.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // html2pdf library ko dynamically load karein
    import('html2pdf.js').then(html2pdf => {
      html2pdf.default().set(opt).from(resumeElement).save();
    });

  }
}
