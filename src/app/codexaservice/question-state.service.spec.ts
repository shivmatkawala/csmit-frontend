import { TestBed } from '@angular/core/testing';

import { QuestionStateService } from './question-state.service';

describe('QuestionStateService', () => {
  let service: QuestionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuestionStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
