import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseBatchManagementComponent } from './course-batch-management.component';

describe('CourseBatchManagementComponent', () => {
  let component: CourseBatchManagementComponent;
  let fixture: ComponentFixture<CourseBatchManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseBatchManagementComponent]
    });
    fixture = TestBed.createComponent(CourseBatchManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
