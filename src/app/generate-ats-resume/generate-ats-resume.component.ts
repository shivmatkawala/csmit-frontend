import { Component, OnInit } from '@angular/core';
import { ApiService, Student } from '../services/api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-generate-ats-resume',
  templateUrl: './generate-ats-resume.component.html',
  styleUrls: ['./generate-ats-resume.component.css']
})
export class GenerateAtsResumeComponent implements OnInit{

  resumeData: Student | null = null;
  studentId: number = 0;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get student ID from route
    this.studentId = 1;
    

    // Fetch resume data
    this.apiService.getResumeData(this.studentId).subscribe({
      next: (data: Student) => {
        this.resumeData = data;
      },
      error: (err) => {
        console.error('Error fetching resume data:', err);
      }
    });
  }

  printResume(): void {
    window.print();
  }

  downloadResume(): void {
    const resumeElement = document.getElementById('resume-content');
    if (!resumeElement) return;

    const opt: any = {  // <-- use 'any' to bypass TS strict typing
  margin: 0.5,
  filename: `${this.resumeData?.first_name}_resume.pdf`,
  image: { type: 'jpeg' as 'jpeg', quality: 0.98 }, // literal type
  html2canvas: { scale: 2 },
  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
};


    // Dynamically import html2pdf.js
    import('html2pdf.js').then(html2pdf => {
      html2pdf.default().set(opt).from(resumeElement).save();
    });

  }
}
