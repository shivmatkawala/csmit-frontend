import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter } from '@angular/core';
import { Course, CreateCourseService } from '../services/create-course.service';
import { InquiryService, InquiryPayload } from '../services/inquiry.service';
import { AlertService } from '../services/alert.service'; 

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  // --- NEW: Output Event Emitter for Navigation ---
  @Output() pageChange = new EventEmitter<string>();

  // UI States
  isMenuOpen = false;
  isHeaderScrolled = false;
  isLogoZoomed = false;
  
  // Mobile Sub-menu State
  showMobileCourses = false;

  // Desktop States
  isCoursesOpen = false;
  
  // Modal State
  isEnrollmentModalOpen = false;
  selectedCourse: string = '';

  // Form Data Models
  enrollmentForm = {
    name: '',
    email: '',
    phone: ''
  };

  isSubmitting = false;
  courses: Course[] = [];

  constructor(
    private el: ElementRef, 
    private courseService: CreateCourseService,
    private inquiryService: InquiryService,
    private alertService: AlertService 
  ) {}

  ngOnInit() {
    this.fetchCourses();
  }

  // --- NEW: Navigation Helper ---
  navigateTo(page: string, event?: Event) {
    if(event) event.preventDefault();
    
    // Emit event to parent (Landing Page)
    this.pageChange.emit(page);
    
    // Close menus if open
    this.isMenuOpen = false;
    this.showMobileCourses = false;
  }

  fetchCourses() {
    this.courseService.listCourses().subscribe({
      next: (data) => {
        this.courses = data;
      },
      error: (error) => {
        console.error('Error fetching courses:', error);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isHeaderScrolled = window.scrollY > 10;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isCoursesOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (!this.isMenuOpen) {
      setTimeout(() => this.showMobileCourses = false, 300);
    }
  }

  openMobileCourses() {
    this.showMobileCourses = true;
  }

  closeMobileCourses() {
    this.showMobileCourses = false;
  }

  zoomLogo() {
    this.isLogoZoomed = !this.isLogoZoomed;
    if (this.isLogoZoomed) setTimeout(() => this.isLogoZoomed = false, 1000);
    // Navigate Home on Logo Click
    this.navigateTo('home');
  }

  toggleCourses(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isCoursesOpen = !this.isCoursesOpen;
  }

  openEnrollmentModal(courseName: string) {
    this.selectedCourse = courseName;
    this.isEnrollmentModalOpen = true;
    this.isCoursesOpen = false;
    this.isMenuOpen = false;
    this.showMobileCourses = false;
    document.body.style.overflow = 'hidden';
    
    this.enrollmentForm = {
      name: '',
      email: '',
      phone: ''
    };
  }

  closeEnrollmentModal() {
    this.isEnrollmentModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  submitEnrollment() {
    if (!this.enrollmentForm.name || !this.enrollmentForm.email || !this.enrollmentForm.phone) {
      this.alertService.warning('Please fill in all fields.', 'Missing Information');
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;

    const payload: InquiryPayload = {
      name: this.enrollmentForm.name,
      phone_number: this.enrollmentForm.phone,
      email: this.enrollmentForm.email,
      course_name: this.selectedCourse
    };

    this.inquiryService.createInquiry(payload).subscribe({
      next: (response) => {
        this.alertService.success(
          `We have received your query for ${this.selectedCourse}. We will contact you shortly.`, 
          'Submitted Successfully!'
        );
        this.closeEnrollmentModal();
        this.isSubmitting = false;
      },
      error: (error) => {
        this.alertService.error(
          'Something went wrong while submitting your inquiry. Please try again later.',
          'Submission Failed'
        );
        this.isSubmitting = false;
      }
    });
  }
}