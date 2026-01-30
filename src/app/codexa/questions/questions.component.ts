import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { QuestionStateService } from 'src/app/codexaservice/question-state.service';

@Component({
  selector: 'app-questions',
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.css']
})
export class QuestionsComponent implements OnInit, OnDestroy {
  question: string = '';
  formattedQuestion: SafeHtml = '';
  private timerInterval: any;
  private questionSub!: Subscription;

  hours = '00';
  minutes = '00';
  seconds = '00';

  constructor(
    private questionState: QuestionStateService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.startTimer();

    // Subscribe to question updates from the AI service
    this.questionSub = this.questionState.question$.subscribe(q => {
      this.question = q;
      this.updateFormattedQuestion(q);
    });
  }

  /**
   * Converts the raw question string (markdown) into safe HTML
   * for a clear and professional display.
   */
  private updateFormattedQuestion(content: string) {
    if (!content) {
      this.formattedQuestion = '';
      return;
    }
    const html = marked.parse(content) as string;
    this.formattedQuestion = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const now = new Date();
      this.hours = String(now.getHours()).padStart(2, '0');
      this.minutes = String(now.getMinutes()).padStart(2, '0');
      this.seconds = String(now.getSeconds()).padStart(2, '0');
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.questionSub) {
      this.questionSub.unsubscribe();
    }
  }
}