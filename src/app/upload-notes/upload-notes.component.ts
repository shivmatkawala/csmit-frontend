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
  
  selectedFile = signal<File | null>(null);
  isSubmitting = signal(false);
  uploadStatus = signal<{type: 'success' | 'error', message: string} | null>(null);
  uploadProgress = signal<number>(0);

  // Category abhi bhi dropdown rakh sakte hain, ya text bhi. Main dropdown rakh raha hu for standard.
  categories = ['Lecture Note', 'Lab Manual', 'Assignment', 'Question Paper'];

  noteForm = this.fb.group({
    subject: ['', Validators.required], // Ab ye Text Input hoga (Ex: "React JS")
    title: ['', Validators.required],   // Ye Topic name hoga (Ex: "Hooks Intro")
    category: ['Lecture Note', Validators.required],
    description: ['']
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
    if (this.noteForm.invalid || !this.selectedFile()) {
        this.noteForm.markAllAsTouched();
        return;
    }

    this.isSubmitting.set(true);
    const file = this.selectedFile() as File;
    // Data me subject manually type kiya hua jayega
    const formData = this.noteForm.value;

    this.notesService.createNoteMetadata(formData).subscribe({
      next: (res: any) => {
        if (res.upload_url) {
          this.uploadFileToS3(res.upload_url, file);
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
          this.uploadStatus.set({ type: 'success', message: 'Note Uploaded Successfully!' });
          
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
    this.uploadStatus.set({ type: 'error', message: msg });
  }
}