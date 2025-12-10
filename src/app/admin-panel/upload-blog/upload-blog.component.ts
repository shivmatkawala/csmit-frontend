import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManageBlogService } from 'src/app/services/manage-blog.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-blog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload-blog.component.html',
  styleUrls: ['./upload-blog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadBlogComponent {
  private fb = inject(FormBuilder);
  private blogService = inject(ManageBlogService);
  
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  fileError = signal<string>('');
  isSubmitting = signal(false);
  uploadStatus = signal<{type: 'success' | 'error', message: string} | null>(null);
  uploadProgress = signal<number>(0); // Progress bar ke liye

  blogForm = this.fb.group({
    title: ['', Validators.required],
    description: ['']
  });

  // --- File Handling (Same as before) ---
  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragging.set(true); }
  onDragLeave(event: DragEvent) { event.preventDefault(); this.isDragging.set(false); }
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files.length) this.validateAndSetFile(event.dataTransfer.files[0]);
  }
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) this.validateAndSetFile(file);
  }
  validateAndSetFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.fileError.set('Only PDF files are allowed.');
      this.selectedFile.set(null);
      return;
    }
    this.fileError.set('');
    this.selectedFile.set(file);
  }
  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedFile.set(null);
  }
  getFileSize(bytes: number | undefined): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  isFieldInvalid(field: string): boolean {
    const control = this.blogForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // --- NEW SUBMIT LOGIC (2-Step Upload) ---
  onSubmit() {
    if (this.blogForm.invalid || !this.selectedFile()) {
      this.blogForm.markAllAsTouched();
      if (!this.selectedFile()) this.fileError.set('Please select a PDF file.');
      return;
    }

    this.isSubmitting.set(true);
    this.uploadStatus.set(null);
    this.uploadProgress.set(0);

    const file = this.selectedFile() as File;
    const blogData = {
      title: this.blogForm.get('title')?.value,
      description: this.blogForm.get('description')?.value
      // Note: Hum file yahan nahi bhej rahe, sirf data
    };

    // Step 1: Register Blog in DB & Get Presigned URL
    this.blogService.createBlogMetadata(blogData).subscribe({
      next: (response: any) => {
        const uploadUrl = response.upload_url;
        
        if (!uploadUrl) {
           this.handleError('Server did not provide an upload URL.');
           return;
        }

        // Step 2: Upload File directly to S3 using that URL
        this.uploadFileToS3(uploadUrl, file);
      },
      error: (err) => {
        this.handleError('Failed to register blog. ' + (err.error?.error || ''));
      }
    });
  }

  uploadFileToS3(url: string, file: File) {
    this.blogService.uploadToS3(url, file).subscribe({
      next: (event: any) => {
        // Progress Bar Logic
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(progress);
        } 
        else if (event.type === HttpEventType.Response) {
          // Success!
          this.isSubmitting.set(false);
          this.uploadStatus.set({ type: 'success', message: 'Blog uploaded successfully!' });
          this.resetForm();
        }
      },
      error: (err) => {
        this.handleError('Failed to upload file to storage.');
      }
    });
  }

  handleError(msg: string) {
    console.error(msg);
    this.isSubmitting.set(false);
    this.uploadStatus.set({ type: 'error', message: msg });
  }

  resetForm() {
    this.blogForm.reset();
    this.selectedFile.set(null);
    this.uploadProgress.set(0);
    setTimeout(() => this.uploadStatus.set(null), 3000);
  }
}