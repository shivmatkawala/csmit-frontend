import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-about-csmit',
  templateUrl: './about-csmit.component.html',
  styleUrls: ['./about-csmit.component.css']
})
export class AboutCsmitComponent {
  // Input property to manage modal visibility from parent
  @Input() isVisible: boolean = false;
  
  // Input for Trainer Data
  @Input() trainers: any[] = [];

  // NOTE: Placement Data Input has been removed as the section is no longer displayed.
  
  // Output event to notify parent component to close the modal
  @Output() closeModal = new EventEmitter<void>();

  // Method to close the modal
  onClose() {
    this.closeModal.emit();
  }
}
