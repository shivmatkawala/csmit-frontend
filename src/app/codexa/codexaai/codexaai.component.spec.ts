import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodexaaiComponent } from './codexaai.component';

describe('CodexaaiComponent', () => {
  let component: CodexaaiComponent;
  let fixture: ComponentFixture<CodexaaiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CodexaaiComponent]
    });
    fixture = TestBed.createComponent(CodexaaiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
