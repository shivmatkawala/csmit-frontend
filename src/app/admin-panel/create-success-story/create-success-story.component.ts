import { Component } from '@angular/core';
import { Router } from '@angular/router';
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
  message: { text: string, type: 'success' | 'error' } | null = null;

  constructor(
    private successService: SuccessStoriesService, 
    private router: Router
  ) {}

  onSubmit() {
    if (this.isValid()) {
      this.isSubmitting = true;
      this.successService.createStory(this.story).subscribe({
        next: (res) => {
          this.message = { text: 'Success Story Added! It is now live on the Navbar.', type: 'success' };
          this.isSubmitting = false;
          this.resetForm();
          // Optional: Redirect back to dashboard after delay
          setTimeout(() => this.router.navigate(['/admin-panel']), 2000);
        },
        error: (err) => {
          this.message = { text: 'Failed to save story. Please try again.', type: 'error' };
          this.isSubmitting = false;
          console.error(err);
        }
      });
    }
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