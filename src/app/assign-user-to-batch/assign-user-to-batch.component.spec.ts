import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignUserToBatchComponent } from './assign-user-to-batch.component';

describe('AssignUserToBatchComponent', () => {
  let component: AssignUserToBatchComponent;
  let fixture: ComponentFixture<AssignUserToBatchComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AssignUserToBatchComponent]
    });
    fixture = TestBed.createComponent(AssignUserToBatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
