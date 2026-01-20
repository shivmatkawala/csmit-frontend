import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone, inject } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BatchDetail, Course, CreateBatchService } from '../services/create-batch.service';
import { SuccessStoriesService, SuccessStory } from '../services/success-stories.service';
import { ManageNotesService, Note } from '../services/manage-notes.service';
import { UiStateService } from '../services/ui-state.service'; 
import { InquiryService } from '../services/inquiry.service'; 
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private batchService = inject(CreateBatchService);
  private successService = inject(SuccessStoriesService);
  private notesService = inject(ManageNotesService);
  private uiService = inject(UiStateService);
  private inquiryService = inject(InquiryService);
  private ngZone = inject(NgZone);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  selectedFeature: 'batch' | 'notes' | 'success' = 'batch';
  isLoading = true;
  
  // --- Batch State ---
  featuredBatchIndex = 0;
  featuredBatch: any = null;
  upcomingBatches: any[] = [];
  private batchInterval: any;

  // --- Success Stories State ---
  successStories: SuccessStory[] = [];
  visibleStories: SuccessStory[] = []; 
  isLoadingStories = false;
  private storyInterval: any;
  currentStoryIndex = 0; 

  // --- Story Modal State ---
  selectedStory: SuccessStory | null = null;
  isStoryModalOpen = false;

  // --- Real-Time Notes State ---
  @ViewChild('noteScrollContainer') noteScrollContainer!: ElementRef;
  
  selectedSyllabus: string = '';
  syllabusOptions: string[] = [];
  
  allNotes: Note[] = [];   
  notesList: Note[] = []; 
  isLoadingNotes = false;
  
  private noteScrollInterval: any;
  private isNoteScrollPaused = false;

  // --- Inquiry Form State ---
  showInquiryForm = false;
  inquiryForm!: FormGroup;
  isSubmitting = false;
  submissionSuccess = false;

  // --- PDF Preview State ---
  isPreviewOpen = false;
  previewUrl: SafeResourceUrl | null = null;
  previewTitle = '';

  ngOnInit() {
    this.initForm();
    this.fetchRealTimeBatches();
    this.fetchSuccessStories(); 
    this.loadSubjects();

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
    this.stopStoryRotation(); 
    
    // --- FIX: Ensure scrollbar is restored if component is destroyed while modal is open ---
    document.body.style.overflow = 'auto';
  }

  // --- INQUIRY FORM LOGIC ---
  initForm() {
    this.inquiryForm = this.fb.group({
      name: ['', Validators.required],
      phone_number: ['', [Validators.required, Validators.pattern('^[0-9]{10,15}$')]],
      email: ['', [Validators.email]], 
      course_name: ['General', Validators.required]
    });
  }

  openInquiryForm(courseName: string = 'General') {
    this.submissionSuccess = false;
    this.inquiryForm.patchValue({ course_name: courseName });
    this.showInquiryForm = true;
    document.body.style.overflow = 'hidden'; // Lock scroll
  }

  closeInquiryForm() {
    this.showInquiryForm = false;
    this.inquiryForm.reset();
    this.submissionSuccess = false;
    document.body.style.overflow = 'auto'; // Unlock scroll
  }

  submitInquiry() {
    if (this.inquiryForm.valid) {
      this.isSubmitting = true;
      const formData = this.inquiryForm.value;
      
      this.inquiryService.createInquiry(formData).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.submissionSuccess = true;
        },
        error: (error) => {
          console.error('Inquiry submission failed', error);
          this.isSubmitting = false;
          alert('Something went wrong. Please try again later.');
        }
      });
    } else {
      this.inquiryForm.markAllAsTouched();
    }
  }

  // --- Notes Logic ---
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

  // --- Preview Modal Logic ---
  openPreviewModal(note: Note) {
    this.notesService.getDownloadLink(note.id).subscribe({
      next: (res) => {
        if (res.download_url) {
           this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(res.download_url);
           this.previewTitle = note.title;
           this.isPreviewOpen = true;
           document.body.style.overflow = 'hidden'; // Lock scroll
        }
      },
      error: () => alert('Could not load preview.')
    });
  }

  closePreviewModal() {
    this.isPreviewOpen = false;
    this.previewUrl = null;
    document.body.style.overflow = 'auto'; // Unlock scroll
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


  // --- BATCH LOGIC ---

  fetchRealTimeBatches() {
    this.isLoading = true;
    this.batchService.getCourses().subscribe({
      next: (courses: Course[]) => {
        if (courses.length === 0) { this.handleEmptyBatches(); return; }
        
        const batchRequests = courses.map(course => 
          this.batchService.getBatchesByCourse(course.courseid).pipe(
            catchError(err => {
              console.warn(`Could not fetch batches for course ${course.courseid}`, err);
              return of([]); 
            })
          )
        );
        
        forkJoin(batchRequests).subscribe({
          next: (responses: BatchDetail[][]) => {
            let allActiveBatches: BatchDetail[] = [];

            responses.forEach((batchList, index) => {
              const currentCourse = courses[index];
              const activeForCourse = batchList.filter(b => {
                 const isActive = b.is_active as any;
                 return isActive !== false && isActive != 0 && isActive !== '0';
              });
              
              activeForCourse.forEach(b => {
                if (!b.course) {
                  b.course = currentCourse; 
                } else if (!b.course.coursename) {
                   b.course = currentCourse;
                }
              });

              allActiveBatches = [...allActiveBatches, ...activeForCourse];
            });

            this.mapToUIModel(allActiveBatches);
          },
          error: (err) => {
            console.error('Global error in batch fetch', err);
            this.handleEmptyBatches();
          }
        });
      },
      error: () => this.handleEmptyBatches()
    });
  }

  mapToUIModel(backendBatches: BatchDetail[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const validBatches = backendBatches.filter(batch => {
      const bAny = batch as any;
      const rawDate = batch.startDate || bAny.start_date || bAny.startDate || bAny.StartDate;
      if (!rawDate) return true; 
      
      if (typeof rawDate === 'string' && rawDate.indexOf('-') > -1) {
        const parts = rawDate.split('-');
        if (parts.length >= 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1; 
          const d = parseInt(parts[2], 10);
          const batchDate = new Date(y, m, d);
          return batchDate >= today; 
        }
      }
      const batchDate = new Date(rawDate);
      if (isNaN(batchDate.getTime())) return true; 
      return batchDate >= today;
    });

    if (validBatches.length === 0) { 
        this.handleEmptyBatches(); 
        return; 
    }

    validBatches.sort((a, b) => {
      const aAny = a as any;
      const bAny = b as any;
      const dateAStr = a.startDate || aAny.start_date || aAny.startDate;
      const dateBStr = b.startDate || bAny.start_date || bAny.startDate;
      
      const dateA = dateAStr ? new Date(dateAStr).getTime() : Infinity;
      const dateB = dateBStr ? new Date(dateBStr).getTime() : Infinity;
      return dateA - dateB;
    });

    const defaultImages = [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    ];

    this.upcomingBatches = validBatches.map((batch, index) => {
      const bAny = batch as any;
      const finalStartDate = batch.startDate || bAny.start_date || bAny.startDate || null;
      const finalTiming = batch.timing || bAny.timing || 'Flexible';
      const finalMode = batch.mode || bAny.mode || 'Online';

      return {
        courseName: batch.course?.coursename || batch.batchName || 'Advanced Course',
        startDate: finalStartDate, 
        time: finalTiming,
        mode: finalMode, 
        description: `Join the active batch "${batch.batchName}". Comprehensive curriculum with ${finalMode} sessions.`,
        tags: ['Active', finalMode, 'Placement Assist'],
        imageUrl: defaultImages[index % defaultImages.length]
      };
    });
    
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

  // --- SUCCESS STORIES LOGIC ---

  fetchSuccessStories() {
      this.isLoadingStories = true;
      this.successService.getStories().subscribe({
          next: (data) => { 
            this.successStories = data; 
            this.isLoadingStories = false; 
            
            if (this.successStories.length > 0) {
               this.updateVisibleStories();
               this.startStoryRotation();
            }
          },
          error: (err) => {
            console.error('Error fetching stories', err);
            this.isLoadingStories = false;
          }
      });
  }

  updateVisibleStories() {
    if (this.successStories.length === 0) return;
    
    const count = 3; 
    this.visibleStories = [];
    
    for (let i = 0; i < count; i++) {
      const index = (this.currentStoryIndex + i) % this.successStories.length;
      this.visibleStories.push(this.successStories[index]);
    }
  }

  startStoryRotation() {
    this.stopStoryRotation();
    this.storyInterval = setInterval(() => {
      this.currentStoryIndex = (this.currentStoryIndex + 1) % this.successStories.length;
      this.updateVisibleStories();
    }, 5000);
  }

  stopStoryRotation() {
    if (this.storyInterval) clearInterval(this.storyInterval);
  }

  openStoryModal(story: SuccessStory) {
    this.selectedStory = story;
    this.isStoryModalOpen = true;
    this.stopStoryRotation(); 
    document.body.style.overflow = 'hidden'; // Lock scroll
  }

  closeStoryModal() {
    this.isStoryModalOpen = false;
    this.selectedStory = null;
    this.startStoryRotation(); 
    document.body.style.overflow = 'auto'; // Unlock scroll
  }
}