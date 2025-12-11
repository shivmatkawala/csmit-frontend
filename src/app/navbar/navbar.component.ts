import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BatchDetail, Course, CreateBatchService } from '../services/create-batch.service';
import { SuccessStoriesService, SuccessStory } from '../services/success-stories.service';
import { ManageNotesService, Note } from '../services/manage-notes.service';
import { UiStateService } from '../services/ui-state.service'; // Import Service

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private batchService = inject(CreateBatchService);
  private successService = inject(SuccessStoriesService);
  private notesService = inject(ManageNotesService);
  private uiService = inject(UiStateService); // Inject Service
  private ngZone = inject(NgZone);

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

  // --- Real-Time Notes State ---
  @ViewChild('noteScrollContainer') noteScrollContainer!: ElementRef;
  
  selectedSyllabus: string = '';
  syllabusOptions: string[] = [];
  
  allNotes: Note[] = [];   
  notesList: Note[] = []; 
  isLoadingNotes = false;
  
  private noteScrollInterval: any;
  private isNoteScrollPaused = false;

  ngOnInit() {
    this.fetchRealTimeBatches();
    this.fetchSuccessStories();
    this.loadSubjects();

    // --- NEW: Listen to Footer Actions ---
    this.uiService.action$.subscribe(payload => {
      if (payload.action === 'show-notes') {
        this.selectFeature('notes');
        this.scrollToFeatures();
      } else if (payload.action === 'show-success') {
        this.selectFeature('success');
        this.scrollToFeatures();
      }
    });
  }

  scrollToFeatures() {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnDestroy() {
    this.stopBatchRotation();
    this.stopNoteScroll();
  }

  loadSubjects() {
    this.notesService.getAllSubjects().subscribe({
      next: (subjects) => {
        this.syllabusOptions = subjects;
        if (this.syllabusOptions.length > 0) {
           this.selectedSyllabus = this.syllabusOptions[0];
        }
      },
      error: (err) => console.error('Failed to load subjects', err)
    });
  }

  selectFeature(feature: 'batch' | 'notes' | 'success') {
    this.selectedFeature = feature;
    
    if (feature === 'notes') {
      if (this.selectedSyllabus) {
        this.fetchNotesBySubject(this.selectedSyllabus);
      } else if (this.syllabusOptions.length > 0) {
        this.selectedSyllabus = this.syllabusOptions[0];
        this.fetchNotesBySubject(this.selectedSyllabus);
      }
    }
  }

  onSyllabusChange(newSubject: string) {
    this.selectedSyllabus = newSubject;
    if (this.selectedFeature === 'notes') {
        this.fetchNotesBySubject(newSubject);
    }
  }

  fetchNotesBySubject(subject: string) {
    this.isLoadingNotes = true;
    this.stopNoteScroll(); 
    this.notesList = []; 

    this.notesService.getNotes(subject).subscribe({
      next: (data) => {
        this.allNotes = data; 
        this.notesList = data; 
        this.isLoadingNotes = false;
        setTimeout(() => this.startNoteScroll(), 500);
      },
      error: (err) => {
        console.error('Error fetching notes:', err);
        this.isLoadingNotes = false;
      }
    });
  }

  onNoteSearch(event: any) {
    const term = event.target.value.toLowerCase();
    this.notesList = this.allNotes.filter(n => 
      n.title.toLowerCase().includes(term) || 
      (n.description && n.description.toLowerCase().includes(term))
    );
  }

  getCategoryClass(category: string): string {
    switch (category) {
      case 'Lecture Note': return 'cat-lecture';
      case 'Assignment': return 'cat-assignment';
      case 'Lab Manual': return 'cat-lab';
      case 'Question Paper': return 'cat-paper';
      default: return '';
    }
  }

  downloadNote(note: Note) {
    this.notesService.getDownloadLink(note.id).subscribe({
      next: (res) => {
        if (res.download_url) {
           const link = document.createElement('a');
           link.href = res.download_url;
           link.target = '_blank';
           link.download = `${note.title}.pdf`;
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
        }
      },
      error: () => alert('Download failed')
    });
  }

  startNoteScroll() {
    this.stopNoteScroll();
    if (this.noteScrollContainer && 
        this.noteScrollContainer.nativeElement.scrollHeight > this.noteScrollContainer.nativeElement.clientHeight) {
      this.ngZone.runOutsideAngular(() => {
        this.noteScrollInterval = setInterval(() => {
          if (!this.isNoteScrollPaused && this.noteScrollContainer) {
            const el = this.noteScrollContainer.nativeElement;
            el.scrollTop += 1; 
            if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
              el.scrollTop = 0;
            }
          }
        }, 50); 
      });
    }
  }

  stopNoteScroll() { if (this.noteScrollInterval) clearInterval(this.noteScrollInterval); }
  pauseNoteScroll() { this.isNoteScrollPaused = true; }
  resumeNoteScroll() { this.isNoteScrollPaused = false; }

  fetchRealTimeBatches() {
    this.isLoading = true;
    this.batchService.getCourses().subscribe({
      next: (courses: Course[]) => {
        if (courses.length === 0) { this.handleEmptyBatches(); return; }
        const batchRequests = courses.map(course => this.batchService.getBatchesByCourse(course.courseid));
        forkJoin(batchRequests).subscribe({
          next: (responses: BatchDetail[][]) => {
            const allActiveBatches = responses.flat().filter(batch => batch.is_active === true);
            this.mapToUIModel(allActiveBatches);
          },
          error: () => this.handleEmptyBatches()
        });
      },
      error: () => this.handleEmptyBatches()
    });
  }

  mapToUIModel(backendBatches: BatchDetail[]) {
    if (backendBatches.length === 0) { this.handleEmptyBatches(); return; }
    const defaultImages = [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    ];
    this.upcomingBatches = backendBatches.map((batch, index) => ({
      courseName: batch.course ? batch.course.coursename : 'Advanced Course',
      startDate: 'Enrolling Now',
      time: 'Check Schedule',
      mode: 'Live Online',
      description: `Join the active batch "${batch.batchName}". Comprehensive curriculum.`,
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

  stopBatchRotation() { if (this.batchInterval) clearInterval(this.batchInterval); }

  fetchSuccessStories() {
      this.isLoadingStories = true;
      this.successService.getStories().subscribe({
          next: (data) => { this.successStories = data; this.isLoadingStories = false; },
          error: () => this.isLoadingStories = false
      });
  }
}