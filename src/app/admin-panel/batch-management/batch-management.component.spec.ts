import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchManagementComponent } from './batch-management.component';

describe('BatchManagementComponent', () => {
  let component: BatchManagementComponent;
  let fixture: ComponentFixture<BatchManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BatchManagementComponent]
    });
    fixture = TestBed.createComponent(BatchManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
