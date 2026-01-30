import { TestBed } from '@angular/core/testing';
import { CodexaChatService } from './codexa-chat.service';


describe('CodexaChatServiceTsService', () => {
  let service: CodexaChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodexaChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
