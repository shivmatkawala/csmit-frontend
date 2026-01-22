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
  @Output() pageChange = new EventEmitter<string>();

  // UI States
  isMenuOpen = false;
  isHeaderScrolled = false;
  isLogoZoomed = false;
  
  // Mobile Sub-menu State
  showMobileCourses = false;

  // Desktop States
  isCoursesOpen = false;
  activePage: string = 'home'; 
  
  // Modal State
  isEnrollmentModalOpen = false;
  selectedCourse: string = '';

  // --- Country Codes List ---
  countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+971', country: 'UAE' },
    { code: '+81', country: 'Japan' },
    { code: '+49', country: 'Germany' },
    { code: '+33', country: 'France' },
    { code: '+86', country: 'China' },
    { code: '+65', country: 'Singapore' },
    { code: 'Others', country: 'Enter Code' } // Added Others option
  ];

  // Flag to toggle between select dropdown and manual input
  isManualCountryCode = false;
  countrySelectValue = '+91'; // To keep track of dropdown selection separately

  // Form Data Models
  enrollmentForm = {
    name: '',
    email: '',
    countryCode: '+91', // Default to India
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

  navigateTo(page: string, event?: Event) {
    if(event) event.preventDefault();
    this.activePage = page;
    this.isCoursesOpen = false;
    this.pageChange.emit(page);
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
    
    // Reset form
    this.enrollmentForm = {
      name: '',
      email: '',
      countryCode: '+91',
      phone: ''
    };
    this.countrySelectValue = '+91'; // Reset dropdown
    this.isManualCountryCode = false; // Reset manual mode
  }

  closeEnrollmentModal() {
    this.isEnrollmentModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  // --- Handle Country Code Changes ---
  onCountryChange() {
    if (this.countrySelectValue === 'Others') {
      this.isManualCountryCode = true;
      this.enrollmentForm.countryCode = '+'; // Reset to + for user input
    } else {
      this.isManualCountryCode = false;
      this.enrollmentForm.countryCode = this.countrySelectValue;
    }
  }

  // --- Sanitize Manual Country Code Input ---
  sanitizeCountryCode(event: any) {
    let value = event.target.value;
    
    // Ensure it starts with +
    if (!value.startsWith('+')) {
      value = '+' + value.replace(/[^0-9]/g, '');
    } else {
      // Keep + at start, allow only numbers after that
      value = '+' + value.substring(1).replace(/[^0-9]/g, '');
    }
    
    this.enrollmentForm.countryCode = value;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Check if it's only digits
    const phoneRegex = /^\d+$/; 
    if (!phoneRegex.test(phone)) return false;

    // Check length 7-15
    return phone.length >= 7 && phone.length <= 15;
  }

  submitEnrollment() {
    if (!this.enrollmentForm.name || !this.enrollmentForm.email || !this.enrollmentForm.phone || !this.enrollmentForm.countryCode) {
      this.alertService.validation('Please fill in all fields.', 'Missing Information');
      return;
    }

    // Validate Country Code (Manual Mode)
    if (this.isManualCountryCode) {
       if (this.enrollmentForm.countryCode === '+' || this.enrollmentForm.countryCode.length < 2) {
          this.alertService.validation('Please enter a valid country code (e.g., +1).', 'Invalid Code');
          return;
       }
    }

    const email = this.enrollmentForm.email.trim();
    if (!this.isValidEmail(email)) {
      this.alertService.validation(
        'Please enter a valid email address (e.g., user@example.com).', 
        'Invalid Email'
      );
      return;
    }

    const phone = this.enrollmentForm.phone.trim();
    if (!this.isValidPhone(phone)) {
      this.alertService.validation(
        'Please enter a valid phone number (7-15 digits only). No spaces or special characters allowed.',
        'Invalid Phone Number'
      );
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;

    // --- Combine Country Code and Phone Number ---
    const fullPhoneNumber = `${this.enrollmentForm.countryCode} ${phone}`;

    const payload: InquiryPayload = {
      name: this.enrollmentForm.name,
      phone_number: fullPhoneNumber, // Send the combined string
      email: email,
      course_name: this.selectedCourse
    };

    this.inquiryService.createInquiry(payload).subscribe({
      next: (response) => {
        this.closeEnrollmentModal(); 
        
        this.alertService.success(
          `We have received your query for ${this.selectedCourse}. We will contact you shortly.`, 
          'Submitted Successfully!'
        );
        this.isSubmitting = false;
      },
      error: (error) => {
        // --- UPDATED ERROR HANDLING ---
        // Display message from backend if available, otherwise generic error
        const backendMessage = error.error?.message;
        
        if (backendMessage) {
           // If it's our duplicate entry message, show it as info or warning
           this.alertService.info(backendMessage, 'Already Registered');
        } else {
           this.alertService.error(
            'Something went wrong while submitting your inquiry. Please try again later.',
            'Submission Failed'
           );
        }
        this.isSubmitting = false;
      }
    });
  }
}