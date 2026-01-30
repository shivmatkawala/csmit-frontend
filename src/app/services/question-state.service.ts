import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QuestionStateService {

  private questionSource = new BehaviorSubject<string>(
    'Ask Codexa to generate a programming question.'
  );

  question$ = this.questionSource.asObservable();

  setQuestion(question: string) {
    this.questionSource.next(question);
  }
}
