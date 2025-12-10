import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BatchDetail, Course, CreateBatchService } from '../services/create-batch.service';
import { SuccessStoriesService, SuccessStory } from '../services/success-stories.service';
// Import new Notes Service
import { ManageNotesService, Note } from '../services/manage-notes.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  selectedFeature: 'batch' | 'notes' | 'success' = 'batch';
  isLoading = true;
  
  // --- Batch State ---
  featuredBatchIndex = 0;
  featuredBatch: any = null;
  upcomingBatches: any[] = [];
  private batchInterval: any;

  // --- Success Stories State ---
  successStories: SuccessStory[] = [];
  isLoadingStories = false;

  // --- Real-Time Notes State (New) ---
  selectedSyllabus: string = 'Full Stack Development';
  // Static options since we removed the hardcoded map
  syllabusOptions = ['Full Stack Development', 'Data Science', 'Python', 'Java', 'Machine Learning'];
  
  notesList: Note[] = [];
  isLoadingNotes = false;
  
  // Stats Counters (Calculated from API data)
  stats = { pdfs: 0, assignments: 0, manuals: 0 };

  constructor(
      private batchService: CreateBatchService,
      private successService: SuccessStoriesService,
      private notesService: ManageNotesService // Injected Notes Service
  ) {}

  ngOnInit() {
    this.fetchRealTimeBatches();
    this.fetchSuccessStories();
  }

  ngOnDestroy() {
    this.stopBatchRotation();
  }

  // --- UI Selection Change ---
  selectFeature(feature: 'batch' | 'notes' | 'success') {
    this.selectedFeature = feature;
    
    // Trigger Notes Fetch only when Notes tab is selected
    if (feature === 'notes') {
      // Fetch only if list is empty or strictly re-fetch every time
      this.fetchNotesBySubject(this.selectedSyllabus);
    }
  }

  onSyllabusChange(newSubject: string) {
    this.selectedSyllabus = newSubject;
    // Fetch new notes immediately if we are on the notes tab
    if (this.selectedFeature === 'notes') {
        this.fetchNotesBySubject(newSubject);
    }
  }

  // ==========================================
  //        REAL-TIME NOTES LOGIC
  // ==========================================

  fetchNotesBySubject(subject: string) {
    this.isLoadingNotes = true;
    this.notesList = []; // Clear old data to show loading state cleanly

    this.notesService.getNotes(subject).subscribe({
      next: (data) => {
        this.notesList = data;
        this.calculateStats(data);
        this.isLoadingNotes = false;
      },
      error: (err) => {
        console.error('Error fetching notes:', err);
        this.isLoadingNotes = false;
      }
    });
  }

  calculateStats(notes: Note[]) {
    // Dynamically calculate stats based on the fetched data
    this.stats = {
      pdfs: notes.filter(n => n.category === 'Lecture Note').length,
      assignments: notes.filter(n => n.category === 'Assignment').length,
      manuals: notes.filter(n => n.category === 'Lab Manual').length
    };
  }

  downloadNote(note: Note) {
    this.notesService.getDownloadLink(note.id).subscribe({
      next: (res) => {
        if (res.download_url) {
          window.open(res.download_url, '_blank');
        }
      },
      error: () => alert('Download failed')
    });
  }

  // ==========================================
  //        EXISTING BATCH LOGIC
  // ==========================================

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

  // ==========================================
  //        EXISTING SUCCESS STORIES LOGIC
  // ==========================================

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
          }
      });
  }
}