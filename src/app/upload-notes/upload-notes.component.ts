import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManageNotesService } from 'src/app/services/manage-notes.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-upload-notes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload-notes.component.html',
  styleUrls: ['./upload-notes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadNotesComponent {
  private fb = inject(FormBuilder);
  private notesService = inject(ManageNotesService);
  
  // Signals for state management
  selectedFile = signal<File | null>(null);
  isSubmitting = signal(false);
  uploadStatus = signal<{type: 'success' | 'error', message: string} | null>(null);
  uploadProgress = signal<number>(0);

  // Dropdown Options
  subjects = ['Full Stack Development', 'Data Science', 'Python', 'Java', 'Machine Learning'];
  categories = ['Lecture Note', 'Lab Manual', 'Assignment', 'Question Paper'];

  noteForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    subject: ['Full Stack Development', Validators.required],
    category: ['Lecture Note', Validators.required]
  });

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile.set(file);
    } else {
      alert('Only PDF files allowed');
    }
  }

  onSubmit() {
    if (this.noteForm.invalid || !this.selectedFile()) return;

    this.isSubmitting.set(true);
    const file = this.selectedFile() as File;
    const formData = this.noteForm.value;

    // Step 1: Create Metadata
    this.notesService.createNoteMetadata(formData).subscribe({
      next: (res: any) => {
        if (res.upload_url) {
          // Step 2: Upload File to S3
          this.uploadFileToS3(res.upload_url, file);
        }
      },
      error: (err) => {
        this.handleError('Metadata creation failed');
      }
    });
  }

  uploadFileToS3(url: string, file: File) {
    this.notesService.uploadToS3(url, file).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.isSubmitting.set(false);
          this.uploadStatus.set({ type: 'success', message: 'Note Uploaded Successfully!' });
          this.noteForm.reset({ subject: 'Full Stack Development', category: 'Lecture Note' });
          this.selectedFile.set(null);
          this.uploadProgress.set(0);
        }
      },
      error: () => this.handleError('S3 Upload Failed')
    });
  }

  handleError(msg: string) {
    this.isSubmitting.set(false);
    this.uploadStatus.set({ type: 'error', message: msg });
  }
}