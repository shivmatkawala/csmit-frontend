import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BatchDetail, Course, CreateBatchService } from '../services/create-batch.service';
// Import new service
import { SuccessStoriesService, SuccessStory } from '../services/success-stories.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  selectedFeature: 'batch' | 'notes' | 'success' = 'batch';
  isLoading = true;
  
  featuredBatchIndex = 0;
  featuredBatch: any = null;
  upcomingBatches: any[] = [];
  
  selectedSyllabus: string = 'Full Stack Development';
  private batchInterval: any;

  // New Property for Real-Time Stories
  successStories: SuccessStory[] = [];
  isLoadingStories = false;

  notesContentMap: any = {
    'Full Stack Development': {
      stats: [
        { value: '25+', label: 'Modules', icon: '📦' },
        { value: '100+', label: 'PDF Notes', icon: '📄' },
        { value: '50+', label: 'Assignments', icon: '📝' }
      ],
      resources: [
        { title: 'Java Oops Cheat Sheet', type: 'PDF', size: '2.5 MB', icon: '☕' },
        { title: 'Angular Lifecycle Hooks', type: 'Guide', size: '1.2 MB', icon: '🅰️' },
        { title: 'Spring Boot Microservices', type: 'E-Book', size: '5.8 MB', icon: '🍃' },
        { title: 'SQL Interview Questions', type: 'PDF', size: '3.1 MB', icon: '💾' }
      ]
    },
    'Data Science': {
      stats: [
        { value: '15+', label: 'Algorithms', icon: '🧮' },
        { value: '40+', label: 'Datasets', icon: '📊' },
        { value: '30+', label: 'Notebooks', icon: '📓' }
      ],
      resources: [
        { title: 'Python Pandas Guide', type: 'PDF', size: '4.2 MB', icon: '🐼' },
        { title: 'Machine Learning roadmap', type: 'Image', size: '1.5 MB', icon: '🤖' },
        { title: 'Statistics for DS', type: 'E-Book', size: '8.1 MB', icon: '📈' },
        { title: 'Tableau Visualization', type: 'Video', size: 'Link', icon: '📉' }
      ]
    }
  };
  syllabusOptions = Object.keys(this.notesContentMap);

  constructor(
      private batchService: CreateBatchService,
      private successService: SuccessStoriesService
  ) {}

  ngOnInit() {
    this.fetchRealTimeBatches();
    this.fetchSuccessStories(); // Call API on load
  }

  ngOnDestroy() {
    this.stopBatchRotation();
  }

  // --- Success Stories API ---
  fetchSuccessStories() {
      this.isLoadingStories = true;
      this.successService.getStories().subscribe({
          next: (data) => {
              this.successStories = data;
              this.isLoadingStories = false;
          },
          error: (err) => {
              console.error('Failed to load stories', err);
              this.isLoadingStories = false;
              // Optional: Keep old dummy data as fallback if API fails
          }
      });
  }

  // --- Batch API (Existing) ---
  fetchRealTimeBatches() {
    this.isLoading = true;
    this.batchService.getCourses().subscribe({
      next: (courses: Course[]) => {
        if (courses.length === 0) {
          this.handleEmptyBatches();
          return;
        }
        const batchRequests = courses.map(course => 
          this.batchService.getBatchesByCourse(course.courseid)
        );
        forkJoin(batchRequests).subscribe({
          next: (responses: BatchDetail[][]) => {
            const allActiveBatches = responses
              .flat()
              .filter(batch => batch.is_active === true);
            this.mapToUIModel(allActiveBatches);
          },
          error: (err) => {
            console.error('Error fetching batches', err);
            this.handleEmptyBatches();
          }
        });
      },
      error: (err) => {
        this.handleEmptyBatches();
      }
    });
  }

  mapToUIModel(backendBatches: BatchDetail[]) {
    if (backendBatches.length === 0) {
      this.handleEmptyBatches();
      return;
    }

    const defaultImages = [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80'
    ];

    this.upcomingBatches = backendBatches.map((batch, index) => ({
      courseName: batch.course ? batch.course.coursename : 'Advanced Course',
      startDate: 'Enrolling Now',
      time: 'Check Schedule',
      mode: 'Live Online',
      description: `Join the active batch "${batch.batchName}". Comprehensive curriculum with live mentorship.`,
      tags: ['Active', 'Placement Assist'],
      imageUrl: defaultImages[index % defaultImages.length]
    }));

    this.featuredBatch = this.upcomingBatches[0];
    this.isLoading = false;
    this.startBatchRotation();
  }

  handleEmptyBatches() {
    this.upcomingBatches = [];
    this.featuredBatch = null;
    this.isLoading = false;
  }

  // --- UI Logic ---
  selectFeature(feature: 'batch' | 'notes' | 'success') {
    this.selectedFeature = feature;
  }

  onSyllabusChange(val: string) {
    this.selectedSyllabus = val;
  }

  get currentNotesData() {
    return this.notesContentMap[this.selectedSyllabus];
  }

  startBatchRotation() {
    this.stopBatchRotation();
    if (this.upcomingBatches.length > 1) {
      this.batchInterval = setInterval(() => {
        this.featuredBatchIndex = (this.featuredBatchIndex + 1) % this.upcomingBatches.length;
        this.featuredBatch = this.upcomingBatches[this.featuredBatchIndex];
      }, 6000);
    }
  }

  stopBatchRotation() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }
}