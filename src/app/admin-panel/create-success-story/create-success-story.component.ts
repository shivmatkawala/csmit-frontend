import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/services/alert.service';
import { SuccessStoriesService, SuccessStory } from 'src/app/services/success-stories.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-create-success-story',
  templateUrl: './create-success-story.component.html',
  styleUrls: ['./create-success-story.component.css']
})
export class CreateSuccessStoryComponent {
  // Data model initialized with empty values
  story: SuccessStory = {
    name: '',
    role: '',
    company: '',
    package: '',
    quote: '',
    image: '',
    logo: ''
  };

  // Properties to hold the actual file objects
  selectedImage: File | null = null;
  selectedLogo: File | null = null;
  isSubmitting = false;

  constructor(
    private successService: SuccessStoriesService, 
    private router: Router,
    private alertService: AlertService
  ) {}

  /**
   * Captures the student image file from the input
   */
  onImageSelected(event: any) {
    this.selectedImage = event.target.files[0];
  }

  /**
   * Captures the company logo file from the input
   */
  onLogoSelected(event: any) {
    this.selectedLogo = event.target.files[0];
  }

  /**
   * Main submission flow: Presigned URL -> S3 Upload -> Database Save
   */
  async onSubmit() {
    // 1. Basic validation for required text fields
    if (!this.isValid()) {
      this.alertService.warning('Please fill in all required fields (Name, Role, Company).', 'Missing Information');
      return;
    }

    // 2. Ensure files are selected
    if (!this.selectedImage || !this.selectedLogo) {
      this.alertService.warning('Please select both a student image and a company logo.', 'Files Required');
      return;
    }

    this.isSubmitting = true;

    // Step 1: Request Presigned URLs from Backend using exact MIME types
    this.successService.getPresignedUrls(this.selectedImage.type, this.selectedLogo.type).subscribe({
      next: (urls) => {
        // Step 2: Upload both files to S3 in parallel
        const imageUpload = this.successService.uploadToS3(urls.image.upload_url, this.selectedImage!);
        const logoUpload = this.successService.uploadToS3(urls.logo.upload_url, this.selectedLogo!);

        forkJoin([imageUpload, logoUpload]).subscribe({
          next: () => {
            // Step 3: Update the story object with the final S3 URLs and save to DB
            this.story.image = urls.image.final_url;
            this.story.logo = urls.logo.final_url;

            this.successService.createStory(this.story).subscribe({
              next: () => {
                this.isSubmitting = false;
                this.alertService.success('Success Story Added! It is now live on the Wall of Fame.', 'Published');
                this.resetForm();
                // Redirecting to admin-panel after successful save
                this.router.navigate(['/admin-panel']);
              },
              error: (err) => this.handleError(err)
            });
          },
          error: (err) => this.handleError(err, 'S3 Upload Failed')
        });
      },
      error: (err) => this.handleError(err, 'Could not get upload permissions')
    });
  }

  /**
   * Centralized error handling
   */
  private handleError(err: any, customMsg: string = 'Failed to save story.') {
    this.isSubmitting = false;
    this.alertService.error(`${customMsg} Please try again.`, 'Error');
    console.error(err);
  }

  /**
   * Checks if required fields are filled
   */
  isValid(): boolean {
    return !!(this.story.name && this.story.company && this.story.role);
  }

  /**
   * Clears form and file selections
   */
  resetForm() {
    this.story = {
      name: '',
      role: '',
      company: '',
      package: '',
      quote: '',
      image: '',
      logo: ''
    };
    this.selectedImage = null;
    this.selectedLogo = null;
  }

  /**
   * Navigation back to dashboard
   */
  goBack() {
    this.router.navigate(['/admin-panel']);
  }
}