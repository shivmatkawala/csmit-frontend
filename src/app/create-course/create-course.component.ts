import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CreateCourseService, Course, Subject } from '../services/create-course.service'; // FIX: Added Subject import
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';

// We will use the 'Course' interface from the service file now.

@Component({
  selector: 'app-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.css']
})
export class CreateCourseComponent implements OnInit {

  // State flags for form submission
  isSubmitting: boolean = false;
  formSubmitted: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // CRUD State
  isEditMode: boolean = false; // To switch between Create and Update mode
  currentCourseId: number | undefined; // Stores the ID of the course being edited
  
  // List State
  courses: Course[] = []; // Fetched course list
  showCourseListPanel: boolean = false; // State for the side panel visibility
  listErrorMessage: string | null = null;
  
  // Data model for the form
  // subjectsInput: to handle subjects as a comma-separated string
  courseData: { 
    courseName: string, 
    contentUrl: string, 
    subjectsInput: string 
  } = {
    // FIX: Initializing with the user's provided data, ensuring subjects are represented as a comma-separated string for the form
    courseName: 'Robbotics eith ROS',
    contentUrl: 'https://example.com/robotis-ros-course-materials',
    subjectsInput: 'Golang, Python, Robotics Operating System'
  };

  constructor(private createCourseService: CreateCourseService) { } 

  ngOnInit(): void {

  }
  
  /**
   * FIX: Helper method to safely format the subjects array for display in the template.
   * This resolves the Parser Error and TS type error related to complex template logic (map).
   * @param course The course object.
   * @returns A comma-separated string of subject names, or 'N/A'.
   */
  getSubjectsDisplay(course: Course): string {
    if (!course.subjects || course.subjects.length === 0) {
        return 'N/A';
    }
    // We explicitly cast the array elements to Subject for type safety in map()
    return (course.subjects as Subject[])
           .map(s => s.subjectname)
           .join(', ');
  }

  /**
   * Toggles the visibility of the course list side panel.
   * Fetch the list when the panel opens.
   */
  toggleCourseListPanel(): void {
    this.showCourseListPanel = !this.showCourseListPanel;
    if (this.showCourseListPanel) {
      this.fetchCourseList();
    }
  }

  /**
   * Fetches the list of courses from the backend API.
   */
  fetchCourseList(): void {
    this.listErrorMessage = null;
    this.createCourseService.listCourses().subscribe({
        next: (data) => {
            // FIX: Map the incoming data to ensure 'courseId' is present and correct (camelCase).
            // This addresses the issue where the API might return 'courseid' (lowercase).
            this.courses = data.map((course: any) => ({
                ...course,
                courseId: course.courseId || course.courseid // Use existing courseId or map from courseid
            })) as Course[];

            // Check if courseId is present in the first item just for a sanity check
            if (this.courses.length > 0 && !this.courses[0].courseId) {
                console.warn("API returned course list but courseId is missing on the first item even after mapping. Check API response structure.");
            }
            if (this.courses.length === 0) {
              this.listErrorMessage = 'No courses found. Please create a new course.';
            }
        },
        error: (error: HttpErrorResponse) => {
            console.error('Error fetching course list:', error);
            this.listErrorMessage = 'Error loading course list: Could not contact the server.';
        }
    });
  }

  /**
   * Resets the form and state to default 'Create' mode.
   */
  resetFormState(form: NgForm): void {
      form.resetForm({
        courseName: '',
        contentUrl: 'https://',
        subjectsInput: ''
      });
      this.isEditMode = false;
      this.currentCourseId = undefined;
      this.formSubmitted = false;
      this.errorMessage = null;
      this.successMessage = null;
  }
  
  /**
   * Pre-fills the form with the selected course data for editing.
   * @param course The course object to load into the form.
   */
  loadCourseForEdit(course: Course): void {
    // FIX: Check for both undefined and null (or 0, if 0 is invalid)
    if (!course.courseId) {
        console.error('Cannot edit a course without a valid ID.', course);
        this.errorMessage = 'Course ID is not available for update.';
        return;
    }

    this.isEditMode = true;
    this.currentCourseId = course.courseId;
    
    // Fill the form data with the selected course
    this.courseData = {
        courseName: course.courseName,
        contentUrl: course.contentUrl,
        // Convert the subjects array of OBJECTS to a comma-separated STRING of names
        subjectsInput: course.subjects && course.subjects.length > 0
                       ? course.subjects.map((sub: Subject) => sub.subjectname).join(', ') 
                       : '' 
    };

    this.showCourseListPanel = false; // Close the panel
    this.errorMessage = null;
    this.successMessage = `Course ID ${course.courseId} loaded for 'Update'.`;
  }
  
  /**
   * Handles the form submission (either CREATE or UPDATE).
   * @param form The NgForm instance.
   */
  onSubmit(form: NgForm): void {
    this.errorMessage = null; 
    this.successMessage = null;
    if (form.invalid) {
      this.errorMessage = 'Form is invalid. Please fill in all required fields correctly.';
      return;
    }

    this.isSubmitting = true;
    
    // Convert subjectsInput string to a simple array of strings (names)
    const subjectsArray: string[] = this.courseData.subjectsInput
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s.length > 0);

    // Construct the API payload object (The backend expects a payload with subjects as string[])
    let payload: { 
        courseId?: number, 
        courseName: string, 
        contentUrl: string, 
        subjects: string[] 
    } = {
        courseName: this.courseData.courseName,
        contentUrl: this.courseData.contentUrl,
        subjects: subjectsArray // This is now string[]
    };
    
    let apiCall: Observable<any>;
    let action: string;

    if (this.isEditMode && this.currentCourseId) {
        // UPDATE operation
        payload.courseId = this.currentCourseId;
        apiCall = this.createCourseService.updateCourse(payload as any); // Type is inferred as correct here now
        action = 'update';
    } else {
        // CREATE operation
        apiCall = this.createCourseService.createCourse(payload);
        action = 'creation';
    }
    
    apiCall.subscribe({
        next: (response) => {
            console.log('API Response:', response);
            this.isSubmitting = false;
            this.successMessage = `Course successfully ${action}d!`;
            this.errorMessage = null;
            this.formSubmitted = true;
            this.resetFormState(form); // Reset form
            this.fetchCourseList(); // Update list
        },
        error: (error: HttpErrorResponse) => {
            console.error('API Error:', error);
            this.isSubmitting = false;
            this.errorMessage = `Error during course ${action}: Could not contact the server.`;
            this.successMessage = null;
        }
    });
  }
  
  /**
   * Handles the course deletion process.
   * @param courseId The ID of the course to delete.
   */
  confirmDelete(courseId: number | undefined): void {
    // FIX: Check for both undefined and null
    if (!courseId) {
      this.errorMessage = 'Course ID is not available for deletion.';
      return;
    }
    
    // Using prompt instead of confirm() as per best practices in iframe environment
    const isConfirmed = prompt(`Are you sure you want to delete Course ID ${courseId}? Type 'DELETE' to confirm.`);
    if (isConfirmed !== 'DELETE') {
      return;
    }

    this.isSubmitting = true;
    this.createCourseService.deleteCourse(courseId).subscribe({
        next: (response) => {
            console.log('Delete API Response:', response);
            this.isSubmitting = false;
            this.successMessage = `Course ID ${courseId} successfully deleted.`;
            this.fetchCourseList(); // Update list
            if (this.currentCourseId === courseId) {
              // If the currently edited course was deleted, reset the form
              this.resetFormState({} as NgForm); 
            }
        },
        error: (error: HttpErrorResponse) => {
            console.error('Delete API Error:', error);
            this.isSubmitting = false;
            this.errorMessage = `Error deleting Course ID ${courseId}.`;
        }
    });
  }
}
