import { Component } from '@angular/core';
import { AlertService } from '../services/alert.service';
import { InquiryService, InquiryPayload } from '../services/inquiry.service';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent {

  contactForm = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitting = false;

  constructor(
    private alertService: AlertService,
    private inquiryService: InquiryService // Injecting InquiryService
  ) {}

  // --- Email Validation Helper ---
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  submitContact() {
    // 1. Basic Validation
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.alertService.validation('Please fill in all required fields.', 'Incomplete Form');
      return;
    }

    // 2. Email Validation
    const email = this.contactForm.email.trim();
    if (!this.isValidEmail(email)) {
      this.alertService.validation(
        'Please enter a valid email address (e.g., user@example.com).', 
        'Invalid Email'
      );
      return;
    }

    if (this.isSubmitting) return;

    this.isSubmitting = true;

    // 3. Prepare Payload for API
    // Since the API expects { name, phone_number, email, course_name }
    // We are mapping the Contact Form data to fit this structure.
    const payload: InquiryPayload = {
      name: this.contactForm.name,
      email: email,
      // Since Contact form doesn't have phone, sending "N/A" to satisfy API requirement
      phone_number: 'N/A', 
      // Mapping Subject & Message to 'course_name' so it shows up in DB
      course_name: `Contact Query: ${this.contactForm.subject} - ${this.contactForm.message}` 
    };

    // 4. Call the API
    this.inquiryService.createInquiry(payload).subscribe({
      next: (response) => {
        console.log('Contact submitted successfully:', response);
        
        // Success Alert
        this.alertService.success(
          'Your message has been sent successfully! We will get back to you soon.', 
          'Message Sent'
        );
        
        // Reset Form
        this.contactForm = {
          name: '',
          email: '',
          subject: '',
          message: ''
        };
        
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error submitting contact form:', error);
        
        // Error Alert
        this.alertService.error(
          'Something went wrong while sending your message. Please try again.',
          'Submission Failed'
        );
        
        this.isSubmitting = false;
      }
    });
  }
}