import { Component, OnInit, ChangeDetectionStrategy, signal, Input } from '@angular/core';
import { Router } from '@angular/router'; 
import { HttpErrorResponse } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import { Course, CreateCourseService, Subject } from 'src/app/services/create-course.service';

// Interface for the custom confirmation modal data
interface ConfirmationData {
    message: string;
    courseId: number; 
}

@Component({
  selector: 'app-manage-course',
  templateUrl: './manage-course.component.html',
  styleUrls: ['./manage-course.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCourseComponent implements OnInit {

  // State properties
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  currentFilter = signal<'all' | number>('all'); 
  isLoadingCourses = signal<boolean>(false);
  
  // Search properties - received via Input from AdminPanel
  @Input() globalSearchQuery: string = ''; // Global search query from the header
  
  // Custom Modal Properties
  isModalOpen = signal<boolean>(false);
  modalData = signal<ConfirmationData | null>(null);
  
  // Custom Message Box for the Course Tab
  courseMessage = signal<{text: string, isError: boolean} | null>(null);

  constructor(
      private courseService: CreateCourseService,
      private router: Router // Used for navigation to edit/create form
  ) { }

  ngOnInit(): void {
    this.fetchCourses();
  }
  
  /**
   * Public method to manually trigger filtering when the external search changes.
   * This is called by the AdminPanelComponent after a debounced search term update.
   */
  triggerExternalSearch(): void {
      this.applyFilterAndSearch();
  }

  /**
   * Helper method to safely format the subjects array for display in the template.
   */
  getSubjectsDisplay(course: Course): string {
    if (!course.subjects || course.subjects.length === 0) {
        return 'N/A';
    }
    return (course.subjects as Subject[])
           .map(s => s.subjectname)
           .join(', ');
  }

  /**
   * Combines filter and search query to update filteredCourses.
   */
  applyFilterAndSearch(): void {
    const query = this.globalSearchQuery.toLowerCase().trim();

    let tempCourses = this.allCourses;
    
    // 1. Apply Search Filter (by course name ONLY)
    if (query) {
      this.filteredCourses = tempCourses.filter(course => 
        course.courseName.toLowerCase().includes(query)
      );
    } else {
      this.filteredCourses = tempCourses;
    }
  }

  // --- Course Management Logic ---

  /**
   * Shows a custom notification message on the page.
   */
  showCourseMessage(text: string, error: boolean): void {
    this.courseMessage.set({text: text, isError: error});
    
    setTimeout(() => {
      this.courseMessage.set(null);
    }, 5000);
  }

  /**
   * Fetches all courses from the backend API.
   */
  fetchCourses(): void {
    if (this.isLoadingCourses()) return; 
    this.isLoadingCourses.set(true);
    
    this.courseService.listCourses().subscribe({
      next: (data) => {
        // Map the incoming data to ensure 'courseId' is present and correct (camelCase).
        this.allCourses = data.map((course: any) => ({
            ...course,
            courseId: course.courseId || course.courseid 
        })) as Course[];

        this.applyFilterAndSearch(); // Apply filter and search on new data
        this.isLoadingCourses.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.showCourseMessage('Failed to fetch course list. Check API connection.', true);
        this.isLoadingCourses.set(false);
        console.error('Fetch Courses Error:', err);
      }
    });
  }

  /**
   * Placeholder for future filter implementation (e.g., filter by category).
   */
  filterCourses(filterId: 'all' | number): void {
    this.currentFilter.set(filterId);
    this.applyFilterAndSearch();
  }
  
  // --- Navigation & CRUD Actions ---
  
  navigateToCreateCourse(): void {
      this.router.navigate(['/create-course']);
  }
  
  navigateToEditCourse(courseId: number | undefined): void {
      if(courseId) {
          // You would typically pass the ID in the route or as a query param
          this.router.navigate(['/create-course'], { queryParams: { id: courseId } });
          // Note: The logic in create-course.component.ts to load the course for edit 
          // based on this ID is not implemented here but is the expected next step 
          // in a full application.
      } else {
           this.showCourseMessage('Course ID is missing for editing.', true);
      }
  }

  /**
   * Shows the custom confirmation modal for deletion.
   */
  showConfirmation(courseId: number | undefined, courseName: string): void {
    if (!courseId) {
        this.showCourseMessage('Course ID is missing for deletion.', true);
        return;
    }
    let message = `Are you sure you want to DELETE the course "${courseName}" (ID: ${courseId}) permanently? This action cannot be undone.`;

    this.modalData.set({ message, courseId });
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
   * Executes the confirmed action (Delete).
   */
  confirmAction(): void {
    const data = this.modalData();
    if (!data) return;
    
    const { courseId } = data;
    this.closeModal();

    this.deleteCourse(courseId);
  }
  
  /**
   * Calls the service to delete a course.
   */
  deleteCourse(courseId: number): void {
    this.isLoadingCourses.set(true); // Show loading while deleting
    this.courseService.deleteCourse(courseId).subscribe({
      next: () => {
        this.showCourseMessage(`Course ID ${courseId} successfully deleted.`, false);
        this.fetchCourses(); // Refresh list
      },
      error: (err: HttpErrorResponse) => {
        this.showCourseMessage(`Failed to delete course ID ${courseId}.`, true);
        this.isLoadingCourses.set(false);
        console.error('Delete Course Error:', err);
      }
    });
  }
}