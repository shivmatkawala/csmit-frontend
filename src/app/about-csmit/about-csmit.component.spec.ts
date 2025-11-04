import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutCsmitComponent } from './about-csmit.component';

describe('AboutCsmitComponent', () => {
  let component: AboutCsmitComponent;
  let fixture: ComponentFixture<AboutCsmitComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AboutCsmitComponent]
    });
    fixture = TestBed.createComponent(AboutCsmitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
