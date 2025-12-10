import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
  styleUrls: ['./section.component.css']
})
export class SectionComponent implements OnInit {
  isModalOpen = false;
  selectedVideoUrl: SafeResourceUrl = '';
  isAboutModalOpen = false;

  trainers = [
    { name: 'Ravi Verma', specialization: 'Lead Data Scientist', experience: '12 Yrs', rating: '4.9', image: 'https://placehold.co/80x80/2980b9/ffffff?text=RV' },
    { name: 'Sneha Patel', specialization: 'Full Stack Architect', experience: '10 Yrs', rating: '4.8', image: 'https://placehold.co/80x80/8e44ad/ffffff?text=SP' },
    { name: 'Arjun Singh', specialization: 'Cyber Security Expert', experience: '15 Yrs', rating: '4.7', image: 'https://placehold.co/80x80/27ae60/ffffff?text=AS' }
  ];

  demoVideos = [
    {
      title: 'C++ Placement Course',
      instructor: 'CodeHelp (Love Babbar)',
      duration: '1:20:00',
      thumbnailUrl: 'https://img.youtube.com/vi/WQoB2z67hvY/hqdefault.jpg', 
      youtubeVideoId: 'WQoB2z67hvY'
    },
    {
      title: 'Python Full Course (100 Days)',
      instructor: 'CodeWithHarry',
      duration: '12:00:00',
      thumbnailUrl: 'https://img.youtube.com/vi/7wnove7K-ZQ/hqdefault.jpg',
      youtubeVideoId: '7wnove7K-ZQ'
    },
    {
      title: 'Java Alpha Placement Course',
      instructor: 'Apna College',
      duration: '15:30',
      thumbnailUrl: 'https://img.youtube.com/vi/yRpLlJmRo2w/hqdefault.jpg',
      youtubeVideoId: 'yRpLlJmRo2w'
    },
    {
      title: 'Complete C Language Tutorial',
      instructor: 'CodeWithHarry',
      duration: '15:00:00',
      thumbnailUrl: 'https://img.youtube.com/vi/ZSPZob_1w9E/hqdefault.jpg',
      youtubeVideoId: 'ZSPZob_1w9E'
    },
    {
      title: 'DSA Series (C++)',
      instructor: 'Apna College',
      duration: '50:10',
      thumbnailUrl: 'https://img.youtube.com/vi/VTLCoHnyACE/hqdefault.jpg',
      youtubeVideoId: 'VTLCoHnyACE'
    },
    {
      title: 'Web Dev Roadmap 2024',
      instructor: 'CodeHelp (Love Babbar)',
      duration: '20:15',
      thumbnailUrl: 'https://img.youtube.com/vi/xWBb7d5f0yI/hqdefault.jpg',
      youtubeVideoId: 'xWBb7d5f0yI'
    },
    {
      title: 'React JS Full Course',
      instructor: 'CodeWithHarry',
      duration: '18:45',
      thumbnailUrl: 'https://img.youtube.com/vi/-mJFZp84TIY/hqdefault.jpg',
      youtubeVideoId: '-mJFZp84TIY'
    },
    {
      title: 'HTML One Shot (Web Dev)',
      instructor: 'Apna College',
      duration: '2:30:00',
      thumbnailUrl: 'https://img.youtube.com/vi/HcOc7P5BMi4/hqdefault.jpg',
      youtubeVideoId: 'HcOc7P5BMi4'
    }
  ];

  scrollerVideos1: any[] = [];
  scrollerVideos2: any[] = [];
  
  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    const videos1 = [...this.demoVideos];
    const videos2 = [...this.demoVideos].slice().reverse();

    // Quadruple the list for smoother infinite scrolling on wide screens
    this.scrollerVideos1 = [...videos1, ...videos1, ...videos1, ...videos1]; 
    this.scrollerVideos2 = [...videos2, ...videos2, ...videos2, ...videos2]; 
  }

  openAboutModal() {
    this.isAboutModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeAboutModal() {
    this.isAboutModalOpen = false;
    document.body.style.overflow = 'auto';
  }

  openModal(videoId: string) {
    const unsafeUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    this.selectedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(unsafeUrl);
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedVideoUrl = '';
    document.body.style.overflow = 'auto';
  }
}