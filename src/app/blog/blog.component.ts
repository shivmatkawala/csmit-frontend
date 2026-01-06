import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone, inject } from '@angular/core';
import { ManageBlogService } from 'src/app/services/manage-blog.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface PdfDocument {
  id: number;
  title: string;
  description: string;
  uploadDate: string;
  fileName: string;
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit, AfterViewInit, OnDestroy {
  
  private blogService = inject(ManageBlogService);
  private sanitizer = inject(DomSanitizer);
  
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  searchTerm: string = '';
  private scrollInterval: any;
  private isPaused = false;
  isLoading = true;

  allDocuments: PdfDocument[] = [];
  filteredDocuments: PdfDocument[] = [];

  // --- Preview Modal State ---
  isPreviewOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  previewTitle = '';

  constructor(private ngZone: NgZone) { }

  ngOnInit(): void {
    this.fetchDocuments();
  }

  fetchDocuments() {
    this.isLoading = true;
    this.blogService.getBlogs().subscribe({
      next: (data) => {
        this.allDocuments = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || 'No description available.',
          uploadDate: this.formatDate(item.created_at || new Date().toISOString()),
          fileName: `${item.title}.pdf`
        }));
        
        this.filteredDocuments = this.allDocuments;
        this.isLoading = false;

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

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.stopAutoScroll();
  }

  // --- Auto Scroll Logic ---
  startAutoScroll() {
    this.stopAutoScroll();
    
    if (this.scrollContainer && this.scrollContainer.nativeElement.scrollHeight > this.scrollContainer.nativeElement.clientHeight) {
        this.ngZone.runOutsideAngular(() => {
        this.scrollInterval = setInterval(() => {
            if (!this.isPaused && this.scrollContainer) {
            const el = this.scrollContainer.nativeElement;
            el.scrollTop += 1;
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

  // --- View Functionality (Opens Modal) ---
  viewPdf(doc: PdfDocument) {
    this.blogService.getDownloadLink(doc.id).subscribe({
      next: (res) => {
        if (res.download_url) {
           this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.download_url);
           this.previewTitle = doc.title;
           this.isPreviewOpen = true;
           this.stopAutoScroll(); 
           document.body.style.overflow = 'hidden'; 
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

  closePreviewModal() {
    this.isPreviewOpen = false;
    this.previewUrl = null;
    this.startAutoScroll();
    document.body.style.overflow = 'auto';
  }

  // --- Download Functionality (Force Download) ---
  downloadPdf(doc: PdfDocument) {
    this.blogService.getDownloadLink(doc.id).subscribe({
      next: (res) => {
        if (res.download_url) {
          // Fetch as blob to force download instead of opening in tab
          fetch(res.download_url)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = doc.fileName; // Forces the browser to download
              document.body.appendChild(link);
              link.click();
              
              // Cleanup
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            })
            .catch(err => {
              console.error('Download failed, falling back to open:', err);
              // Fallback if fetch fails (e.g. CORS issues)
              window.open(res.download_url, '_blank');
            });
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