import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManageNotesService } from 'src/app/services/manage-notes.service';
import { HttpEventType } from '@angular/common/http';
import { Router } from '@angular/router'; // Import Router
import { AlertService } from '../services/alert.service'; // Import AlertService

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
  private router = inject(Router);
  private alertService = inject(AlertService);
  
  selectedFile = signal<File | null>(null);
  isSubmitting = signal(false);
  uploadProgress = signal<number>(0);

  categories = ['Lecture Note','Assignment', 'Question Paper'];

  noteForm = this.fb.group({
    subject: ['', Validators.required], 
    title: ['', Validators.required],   
    category: ['Lecture Note', Validators.required],
    description: ['']
  });

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile.set(file);
    } else {
      this.alertService.warning('Only PDF files are allowed.', 'Invalid File');
      this.selectedFile.set(null);
    }
  }

  onSubmit() {
    if (this.noteForm.invalid || !this.selectedFile()) {
        this.noteForm.markAllAsTouched();
        if (!this.selectedFile()) {
            this.alertService.warning('Please select a PDF file.');
        } else {
            this.alertService.warning('Please fill in all required fields.');
        }
        return;
    }

    this.isSubmitting.set(true);
    const file = this.selectedFile() as File;
    const formData = this.noteForm.value;

    this.notesService.createNoteMetadata(formData).subscribe({
      next: (res: any) => {
        if (res.upload_url) {
          this.uploadFileToS3(res.upload_url, file);
        } else {
           this.handleError('Server did not provide an upload URL.');
        }
      },
      error: (err) => {
        this.handleError('Metadata creation failed. Check Server.');
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
          this.alertService.success('Note Uploaded Successfully!', 'Success');
          
          // Form Reset
          this.noteForm.reset({ category: 'Lecture Note' });
          this.selectedFile.set(null);
          this.uploadProgress.set(0);
        }
      },
      error: () => this.handleError('S3 Upload Failed')
    });
  }

  handleError(msg: string) {
    this.isSubmitting.set(false);
    this.alertService.error(msg, 'Error');
  }

  goBack() {
    this.router.navigate(['/admin-panel']);
  }
}