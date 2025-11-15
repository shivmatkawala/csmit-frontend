import { Component, OnInit, ChangeDetectionStrategy, signal, Input } from '@angular/core';
import { Router } from '@angular/router'; 
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { BatchDetail, Course, CreateBatchService } from 'src/app/services/create-batch.service';

interface ConfirmationData {
    message: string;
    batchId: number; 
    batchName: string;
    action: 'Activate' | 'Deactivate';
}

@Component({
  selector: 'app-batch-management',
  templateUrl: './batch-management.component.html',
  styleUrls: ['./batch-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchManagementComponent implements OnInit {

  allBatches: BatchDetail[] = [];
  filteredBatches: BatchDetail[] = [];
  allCourses: Course[] = [];
  currentFilter = signal<'all' | number>('all');
  isLoadingBatches = signal<boolean>(false);
  
  @Input() globalSearchQuery: string = '';
  
  isModalOpen = signal<boolean>(false);
  modalData = signal<ConfirmationData | null>(null);
  
  batchMessage = signal<{text: string, isError: boolean} | null>(null);

  constructor(
      private batchService: CreateBatchService,
      private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchCourses();
  }
  
  /**
   * Public method to manually trigger filtering when the external search changes.
   */
  triggerExternalSearch(): void {
      this.applyFilterAndSearch();
  }
  
  /**
   * Fetches all courses to populate the filter dropdown.
   */
  fetchCourses(): void {
      this.isLoadingBatches.set(true);
      this.batchService.getCourses().subscribe({
          next: (data: Course[]) => {
              this.allCourses = data;
              this.fetchBatchesForAllCourses(); 
          },
          error: (err: HttpErrorResponse) => {
              this.showBatchMessage('Failed to fetch courses for filtering. Cannot load batches.', true);
              console.error('Fetch Courses Error:', err);
              this.isLoadingBatches.set(false);
          }
      });
  }

  /**
   * Fetches all batches by iterating through the fetched courses.
   * FIX: Manually attaches the missing 'course' object to each batch,
   * as the API response seems incomplete based on the user's report.
   */
  fetchBatchesForAllCourses(): void {
    if (this.allCourses.length === 0) {
        this.allBatches = [];
        this.showBatchMessage('No courses available to fetch batches.', false);
        this.isLoadingBatches.set(false);
        this.applyFilterAndSearch();
        return;
    }
    
    // Create an array of observables, one for each course's batches
    const batchRequests = this.allCourses.map(course =>
        this.batchService.getBatchesByCourse(course.courseid).pipe(
            catchError(err => {
                console.error(`Error fetching batches for course ID ${course.courseid}:`, err);
                // Return an empty array on error so forkJoin continues
                return of([]); 
            })
        )
    );

    forkJoin(batchRequests).subscribe({
        next: (results: BatchDetail[][]) => {
            let combinedBatches: BatchDetail[] = [];
            
            // Iterate through the results and manually attach the course data
            results.forEach((batchesForCourse, index) => {
                const correspondingCourse = this.allCourses[index];
                
                batchesForCourse.forEach(batch => {
                    // Inject the missing course data if it's not present (based on user's API snippet)
                    if (!batch.course) {
                        // We cast to 'any' here temporarily to assign the Course object, 
                        // matching the BatchDetail interface expectation.
                        (batch as any).course = correspondingCourse; 
                    }
                    combinedBatches.push(batch);
                });
            });
            
            this.allBatches = combinedBatches; 
            this.isLoadingBatches.set(false);
            this.applyFilterAndSearch(); 
        },
        error: (err) => { 
            this.showBatchMessage('Failed to fetch all batches after course loading.', true);
            this.isLoadingBatches.set(false);
            console.error('ForkJoin Batches Error:', err);
        }
    });
  }

  /**
   * Combines filter (by course) and search query (by batch name/ID) to update filteredBatches.
   */
  applyFilterAndSearch(): void {
    const query = this.globalSearchQuery.toLowerCase().trim();
    const courseIdFilter = this.currentFilter();

    let tempBatches = this.allBatches;
    
    // 1. Apply Course Filter
    if (courseIdFilter !== 'all') {
      tempBatches = tempBatches.filter(batch => 
        batch.course.courseid === courseIdFilter
      );
    }
    
    // 2. Apply Search Filter (by Batch Name or Batch ID)
    if (query) {
        const isNumeric = /^\d+$/.test(query);
        
        this.filteredBatches = tempBatches.filter(batch => {
            const nameMatch = batch.batchName.toLowerCase().includes(query);
            const idMatch = isNumeric && batch.batchId.toString().includes(query);

            return nameMatch || idMatch;
        });
    } else {
      this.filteredBatches = tempBatches;
    }
  }

  /**
   * Shows a custom notification message on the page.
   */
  showBatchMessage(text: string, error: boolean): void {
    this.batchMessage.set({text: text, isError: error});
    
    setTimeout(() => {
      this.batchMessage.set(null);
    }, 5000);
  }

  /**
   * Handles change in the Course filter dropdown.
   */
  filterBatches(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const value = selectElement.value;
    
    const filterId: 'all' | number = value === 'all' ? 'all' : parseInt(value, 10);
    this.currentFilter.set(filterId);
    this.applyFilterAndSearch();
  }
  
  navigateToCreateBatch(): void {
      this.router.navigate(['/create-batch']);
  }
  
  /**
   * Shows the custom confirmation modal for activation/deactivation.
   */
  showConfirmation(batch: BatchDetail, action: 'Activate' | 'Deactivate'): void {
    let message: string;
    if (action === 'Activate') {
        message = `Are you sure you want to ACTIVATE the batch "${batch.batchName}" (ID: ${batch.batchId})? Active batches can be assigned to students.`;
    } else {
        message = `Are you sure you want to DEACTIVATE the batch "${batch.batchName}" (ID: ${batch.batchId})? Deactivated batches cannot be assigned to new students.`;
    }

    this.modalData.set({ message, batchId: batch.batchId, batchName: batch.batchName, action });
    this.isModalOpen.set(true);
  }
  
  /**
   * Closes the custom confirmation modal.
   */
  closeModal(): void {
    this.isModalOpen.set(false);
    this.modalData.set(null);
  }

  /**
   * Executes the confirmed action (Activate/Deactivate).
   */
  confirmAction(): void {
    const data = this.modalData();
    if (!data) return;
    
    const { batchId, action } = data;
    this.closeModal();

    this.toggleBatchStatus(batchId, action);
  }
  
  /**
   * Calls the service to activate or deactivate a batch.
   */
  toggleBatchStatus(batchId: number, action: 'Activate' | 'Deactivate'): void {
    this.isLoadingBatches.set(true);
    const apiCall = action === 'Activate' 
                  ? this.batchService.reactivateBatch(batchId) 
                  : this.batchService.deactivateBatch(batchId);
                  
    apiCall.subscribe({
      next: () => {
        this.showBatchMessage(`Batch ID ${batchId} successfully ${action.toLowerCase()}d.`, false);
        this.fetchCourses(); 
      },
      error: (err: HttpErrorResponse) => {
        this.showBatchMessage(`Failed to ${action.toLowerCase()} batch ID ${batchId}.`, true);
        this.isLoadingBatches.set(false);
        console.error(`${action} Batch Error:`, err);
        this.fetchCourses(); 
      }
    });
  }
}