import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

interface PdfDocument {
  id: number;
  title: string;
  description: string;
  uploadDate: string;
  fileName: string;
  fileUrl: string;
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // Container ko access karne ke liye ViewChild
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  searchTerm: string = '';
  private scrollInterval: any;
  private isPaused = false;

  allDocuments: PdfDocument[] = [
    {
      id: 1,
      title: 'Semester 1 - Computer Science Syllabus',
      description: 'Complete syllabus breakdown for the first semester including C++ and Data Structures.',
      uploadDate: '05 Dec, 2023',
      fileName: 'CS_Sem1_Syllabus.pdf',
      fileUrl: 'assets/docs/syllabus.pdf'
    },
    {
      id: 2,
      title: 'End Term Examination Schedule 2024',
      description: 'Datesheet for upcoming winter examinations. Please check your subject codes carefully.',
      uploadDate: '01 Dec, 2023',
      fileName: 'Exam_Datesheet_2024.pdf',
      fileUrl: '#'
    },
    {
      id: 3,
      title: 'Placement Drive - Google & Microsoft',
      description: 'Eligibility criteria and registration form for the upcoming campus drive.',
      uploadDate: '28 Nov, 2023',
      fileName: 'Placement_Brochure.pdf',
      fileUrl: '#'
    },
    {
      id: 4,
      title: 'Holiday List 2024',
      description: 'List of official gazetted holidays for the academic year 2024.',
      uploadDate: '20 Nov, 2023',
      fileName: 'Holidays_2024.pdf',
      fileUrl: '#'
    },
    {
      id: 5,
      title: 'Hostel Allocation List - Boys & Girls',
      description: 'Final list of students allotted rooms in Block A and Block B.',
      uploadDate: '15 Nov, 2023',
      fileName: 'Hostel_List_Final.pdf',
      fileUrl: '#'
    },
    {
      id: 6,
      title: 'Anti-Ragging Policy Guidelines',
      description: 'Mandatory reading for all freshers and seniors regarding campus code of conduct.',
      uploadDate: '10 Nov, 2023',
      fileName: 'Anti_Ragging_Policy.pdf',
      fileUrl: '#'
    }
  ];

  filteredDocuments: PdfDocument[] = [];

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    this.filteredDocuments = this.allDocuments;
  }

  ngAfterViewInit() {
    // View init hone ke baad scroll start karein
    this.startAutoScroll();
  }

  ngOnDestroy() {
    // Component destroy hone par interval clear karein
    this.stopAutoScroll();
  }

  // --- Auto Scroll Logic ---
  startAutoScroll() {
    this.ngZone.runOutsideAngular(() => {
      this.scrollInterval = setInterval(() => {
        if (!this.isPaused && this.scrollContainer) {
          const el = this.scrollContainer.nativeElement;
          
          // 1px niche scroll karo
          el.scrollTop += 1;

          // Agar bottom par pahunch gaye, toh wapas top par jao (Loop)
          if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
            el.scrollTop = 0;
          }
        }
      }, 50); // Speed control: 50ms (Lower is faster)
    });
  }

  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
    }
  }

  // Mouse hover events ke liye handlers
  pauseScroll() {
    this.isPaused = true;
  }

  resumeScroll() {
    this.isPaused = false;
  }

  onSearchChange(searchValue: string) {
    this.searchTerm = searchValue;
    this.filteredDocuments = this.allDocuments.filter(doc => 
      doc.title.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
      doc.description.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  viewPdf(doc: PdfDocument) {
    console.log('Viewing PDF:', doc.title);
    alert(`Opening ${doc.fileName}...`);
  }

  downloadPdf(doc: PdfDocument) {
    console.log('Downloading PDF:', doc.title);
    alert(`Downloading ${doc.fileName}...`);
  }
}