import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone, inject } from '@angular/core';
import { ManageBlogService } from 'src/app/services/manage-blog.service';

interface PdfDocument {
  id: number;
  title: string;
  description: string;
  uploadDate: string;
  fileName: string;
  // fileUrl hum ab on-demand fetch karenge API se
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit, AfterViewInit, OnDestroy {
  
  private blogService = inject(ManageBlogService);
  
  // Container ko access karne ke liye ViewChild
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  searchTerm: string = '';
  private scrollInterval: any;
  private isPaused = false;
  isLoading = true; // Loading state flag

  allDocuments: PdfDocument[] = [];
  filteredDocuments: PdfDocument[] = [];

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    this.fetchDocuments();
  }

  fetchDocuments() {
    this.isLoading = true;
    this.blogService.getBlogs().subscribe({
      next: (data) => {
        // API response ko frontend interface me map kar rahe hain
        this.allDocuments = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || 'No description available.',
          uploadDate: this.formatDate(item.created_at || new Date().toISOString()),
          fileName: `${item.title}.pdf`
        }));
        
        this.filteredDocuments = this.allDocuments;
        this.isLoading = false;

        // Data aane ke thodi der baad scroll start karein
        setTimeout(() => {
          this.startAutoScroll();
        }, 500);
      },
      error: (err) => {
        console.error('Error fetching blogs:', err);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  ngAfterViewInit() {
    // Scroll start ab data load hone ke baad hoga
  }

  ngOnDestroy() {
    this.stopAutoScroll();
  }

  // --- Auto Scroll Logic ---
  startAutoScroll() {
    this.stopAutoScroll(); // Clear existing if any
    
    // Only start if content exists and is scrollable
    if (this.scrollContainer && this.scrollContainer.nativeElement.scrollHeight > this.scrollContainer.nativeElement.clientHeight) {
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
        }, 50); 
        });
    }
  }

  stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
    }
  }

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

  // --- View Functionality ---
  viewPdf(doc: PdfDocument) {
    // Pehle download URL fetch karo, fir new tab me open karo
    this.blogService.getDownloadLink(doc.id).subscribe({
      next: (res) => {
        if (res.download_url) {
           window.open(res.download_url, '_blank');
        } else {
           alert('Error: File URL not found.');
        }
      },
      error: (err) => {
        console.error('Error fetching view link:', err);
        alert('Unable to open file.');
      }
    });
  }

  // --- Download Functionality ---
  downloadPdf(doc: PdfDocument) {
    this.blogService.getDownloadLink(doc.id).subscribe({
      next: (res) => {
        if (res.download_url) {
           // Create a hidden link and click it to trigger download/view
           const link = document.createElement('a');
           link.href = res.download_url;
           link.target = '_blank';
           link.download = doc.fileName; // Try to force filename
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
        } else {
           alert('Error: Download URL not found.');
        }
      },
      error: (err) => {
        console.error('Error fetching download link:', err);
        alert('Unable to download file.');
      }
    });
  }
}