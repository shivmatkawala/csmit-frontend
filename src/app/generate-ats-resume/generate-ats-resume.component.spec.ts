import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateAtsResumeComponent } from './generate-ats-resume.component';

describe('GenerateAtsResumeComponent', () => {
  let component: GenerateAtsResumeComponent;
  let fixture: ComponentFixture<GenerateAtsResumeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GenerateAtsResumeComponent]
    });
    fixture = TestBed.createComponent(GenerateAtsResumeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
