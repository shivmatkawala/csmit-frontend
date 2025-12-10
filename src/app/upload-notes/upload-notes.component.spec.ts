import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadNotesComponent } from './upload-notes.component';

describe('UploadNotesComponent', () => {
  let component: UploadNotesComponent;
  let fixture: ComponentFixture<UploadNotesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UploadNotesComponent]
    });
    fixture = TestBed.createComponent(UploadNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
