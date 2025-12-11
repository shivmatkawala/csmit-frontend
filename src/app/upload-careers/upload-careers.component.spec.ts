import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadCareersComponent } from './upload-careers.component';

describe('UploadCareersComponent', () => {
  let component: UploadCareersComponent;
  let fixture: ComponentFixture<UploadCareersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UploadCareersComponent]
    });
    fixture = TestBed.createComponent(UploadCareersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
