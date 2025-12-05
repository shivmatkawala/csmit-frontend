import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSuccessStoryComponent } from './create-success-story.component';

describe('CreateSuccessStoryComponent', () => {
  let component: CreateSuccessStoryComponent;
  let fixture: ComponentFixture<CreateSuccessStoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreateSuccessStoryComponent]
    });
    fixture = TestBed.createComponent(CreateSuccessStoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
