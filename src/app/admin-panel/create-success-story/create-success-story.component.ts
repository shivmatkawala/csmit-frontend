import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/services/alert.service';
import { SuccessStoriesService, SuccessStory } from 'src/app/services/success-stories.service';
@Component({
  selector: 'app-create-success-story',
  templateUrl: './create-success-story.component.html',
  styleUrls: ['./create-success-story.component.css']
})
export class CreateSuccessStoryComponent {
  story: SuccessStory = {
    name: '',
    role: '',
    company: '',
    package: '',
    quote: '',
    image: '',
    logo: ''
  };

  isSubmitting = false;

  constructor(
    private successService: SuccessStoriesService, 
    private router: Router,
    private alertService: AlertService // Inject AlertService
  ) {}

  onSubmit() {
    if (!this.isValid()) {
      this.alertService.warning('Please fill in all required fields (Name, Role, Company).', 'Missing Information');
      return;
    }

    this.isSubmitting = true;
    this.successService.createStory(this.story).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.alertService.success('Success Story Added! It is now live on the Navbar.', 'Published');
        
        this.resetForm();
        // Optional: Redirect back to dashboard after delay
        // setTimeout(() => this.router.navigate(['/admin-panel']), 2000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alertService.error('Failed to save story. Please try again.', 'Error');
        console.error(err);
      }
    });
  }

  isValid(): boolean {
    return !!(this.story.name && this.story.company && this.story.role);
  }

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
  }

  goBack() {
    this.router.navigate(['/admin-panel']);
  }
}