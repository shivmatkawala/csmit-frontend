import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyntaxshareComponent } from './syntaxshare.component';

describe('SyntaxshareComponent', () => {
  let component: SyntaxshareComponent;
  let fixture: ComponentFixture<SyntaxshareComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SyntaxshareComponent]
    });
    fixture = TestBed.createComponent(SyntaxshareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
