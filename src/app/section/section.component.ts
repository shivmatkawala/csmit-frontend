import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
  styleUrls: ['./section.component.css']
})
export class SectionComponent implements OnInit {
  // State for managing the video player modal
  isModalOpen = false;
  selectedVideoUrl: SafeResourceUrl = '';
  
  // NEW STATE: State for managing the About CSMIT modal
  isAboutModalOpen = false;

  // Mock Trainer Data (will be passed to about-csmit component)
  trainers = [
    { name: 'Ravi Verma', specialization: 'Lead Data Scientist', experience: '12 Yrs', rating: '4.9', image: 'https://placehold.co/80x80/2980b9/ffffff?text=RV' },
    { name: 'Sneha Patel', specialization: 'Full Stack Architect', experience: '10 Yrs', rating: '4.8', image: 'https://placehold.co/80x80/8e44ad/ffffff?text=SP' },
    { name: 'Arjun Singh', specialization: 'Cyber Security Expert', experience: '15 Yrs', rating: '4.7', image: 'https://placehold.co/80x80/27ae60/ffffff?text=AS' }
  ];

  // Original array of demo video data with updated, high-quality thumbnails
  demoVideos = [
    {
      title: 'Python Full Stack Development',
      instructor: 'Intellipaat',
      duration: '10:02:24',
      thumbnailUrl: '',
      youtubeVideoId: 'Fazx_fB3cQc'
    },
    {
      title: 'Complete Data Science Roadmap',
      instructor: 'Krish Naik',
      duration: '12:35',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
      youtubeVideoId: 'FIIg_j_8_tU'
    },
    {
      title: 'Java & Spring Boot Masterclass',
      instructor: 'Simplilearn',
      duration: '9:52:01',
      thumbnailUrl: 'https://images.unsplash.com/photo-1628187821639-5a1d7ea321fd?q=80&w=1974&auto=format&fit=crop',
      youtubeVideoId: 'Ke7Tr4_ms6s'
    },
    {
      title: 'Cyber Security Full Course',
      instructor: 'Edureka',
      duration: '10:04:22',
      thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
      youtubeVideoId: 'Yp6--gB9a_k'
    },
    {
      title: 'AWS Certified Solutions Architect',
      instructor: 'freeCodeCamp.org',
      duration: '13:54:30',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=2070&auto=format&fit=crop',
      youtubeVideoId: 'k1RI5locg_k'
    },
    {
      title: 'DevOps Engineering Course',
      instructor: 'Simplilearn',
      duration: '10:59:02',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=1902&auto=format&fit=crop',
      youtubeVideoId: 'h_I12deC1yA'
    },
    {
      title: 'MERN Stack Project Tutorial',
      instructor: 'Dave Gray',
      duration: '3:45:01',
      thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2070&auto=format&fit=crop',
      youtubeVideoId: 'ktjG3b0a-3c'
    },
    {
      title: 'Machine Learning for Everybody',
      instructor: 'freeCodeCamp.org',
      duration: '4:21:49',
      thumbnailUrl: 'https://images.unsplash.com/photo-1531771686035-25f474d7c17d?q=80&w=1966&auto=format&fit=crop',
      youtubeVideoId: 'ukzFI9rgwfU'
    }
  ];

  // New arrays for the scrollers to create a seamless loop
  scrollerVideos1: any[] = [];
  scrollerVideos2: any[] = [];
  
  // Injecting DomSanitizer to securely handle YouTube URLs
  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // Duplicate the array for a seamless scroll effect
    const videos1 = [...this.demoVideos];
    // A reversed copy for the second scroller to move in the opposite direction
    const videos2 = [...this.demoVideos].slice().reverse();

    // Populate the scroller arrays by duplicating them
    this.scrollerVideos1 = [...videos1, ...videos1]; 
    this.scrollerVideos2 = [...videos2, ...videos2]; 
  }

  // NEW METHOD: Opens the About CSMIT modal and prevents body scrolling
  openAboutModal() {
    this.isAboutModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  // NEW METHOD: Closes the About CSMIT modal and restores body scrolling
  closeAboutModal() {
    this.isAboutModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  /**
   * Opens the video modal and sets the URL for the selected video.
   * @param videoId The YouTube ID of the video to play.
   */
  openModal(videoId: string) {
    // Construct the URL and mark it as safe for embedding
    const unsafeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    this.selectedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);
    this.isModalOpen = true;
    // Prevent body scrolling behind the video modal
    document.body.style.overflow = 'hidden';
  }

  /**
   * Closes the video modal and clears the video URL.
   */
  closeModal() {
    this.isModalOpen = false;
    this.selectedVideoUrl = '';
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  }
}
