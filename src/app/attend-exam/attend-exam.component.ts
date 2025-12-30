import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { examAPi } from '../services/createexam.service';
import { ApiService, LoginResponse} from '../services/api.service';
import { Subscription, interval, of, Observable, forkJoin } from 'rxjs';
import { catchError, map, concatMap, tap } from 'rxjs/operators';

interface QuestionOption {
  optionid: number; 
  option_text: string;
}

interface ExamQuestion {
  questionid: number; 
  questiontext: string; 
  points: number;
  questiontypeid: number; 
  options: QuestionOption[];
  studentAnswer: string | number | null; 
  status: 'unanswered' | 'answered'; // 'marked' removed as requested
}

interface AttemptResult {
  attemptid: number;
  total_score: number;
  max_score: number;
  status_message: string;
}

interface DetailedAnswer {
    questionid: number;
    question_text: string;
    question_type_id: number;
    student_answer: string;
    ai_score: number;
    ai_feedback: string;
    points_earned: number;
    max_points: number;
}

@Component({
  selector: 'app-attend-exam',
  templateUrl: './attend-exam.component.html',
  styleUrls: ['./attend-exam.component.css']
})
export class AttendExamComponent implements OnInit, OnDestroy {
  @Input() examId: number | null = null;
  @Input() durationMinutes: number = 60;
  @Input() examName: string = 'Corporate Technical Assessment';

  @Output() examFinished = new EventEmitter<{ status: 'submitted' | 'expired', message: string }>();
  
  isLoading: boolean = true;
  error: string | null = null;
  isSubmitting: boolean = false;

  questions: ExamQuestion[] = [];
  currentQuestionIndex: number = 0;
  
  timeLeftSeconds: number = 0;
  timerSubscription: Subscription | undefined;
  formattedTimeLeft: string = '00:00:00';
  
  showResult: boolean = false;
  finalResult: AttemptResult | null = null;
  attemptId: number | null = null; 
  detailedAnswers: DetailedAnswer[] = []; 

  // Tab Switching Prevention Logic
  tabSwitchCount: number = 0;
  maxTabSwitches: number = 3;
  showTabWarning: boolean = false;

  constructor(private examService: examAPi, private apiService: ApiService) {}

  @HostListener('window:blur', ['$event'])
  onBlur(event: any): void {
    if (!this.showResult && !this.isLoading && !this.isSubmitting && this.questions.length > 0) {
      this.handleTabSwitch();
    }
  }

  @HostListener('document:visibilitychange', ['$event'])
  onVisibilityChange(event: any): void {
    if (document.hidden && !this.showResult && !this.isLoading && !this.isSubmitting) {
      this.handleTabSwitch();
    }
  }

  handleTabSwitch(): void {
    this.tabSwitchCount++;
    if (this.tabSwitchCount >= this.maxTabSwitches) {
      this.autoSubmitExam('expired', 'Exam terminated due to multiple tab switching violations.');
    } else {
      this.showTabWarning = true;
    }
  }

  closeWarning(): void {
    this.showTabWarning = false;
  }

  ngOnInit(): void {
    if (this.examId) {
      this.fetchExamQuestions(this.examId);
      this.timeLeftSeconds = this.durationMinutes * 60;
      this.startTimer();
    } else {
      this.error = 'Invalid Session: Exam ID is missing.';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }
  
  fetchExamQuestions(examId: number): void {
    this.isLoading = true;
    this.examService.fetchExamQuestions(examId).pipe(
      map((res: any[]) => {
        return res.map(q => ({
          questionid: q.questionid,
          questiontext: q.questiontext,
          points: q.points,
          questiontypeid: q.questiontypeid,
          options: (q.options || []).map((opt: any) => ({
             optionid: opt.optionid, 
             option_text: opt.optiontext
          })),
          studentAnswer: q.questiontypeid === 1 ? null : '', 
          status: 'unanswered'
        } as ExamQuestion));
      }),
      catchError(err => {
        this.error = 'Failed to synchronize with server. Please refresh.';
        this.isLoading = false;
        return of([]);
      })
    ).subscribe((questions: ExamQuestion[]) => {
      this.questions = questions;
      this.isLoading = false;
    });
  }
  
  startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        this.formattedTimeLeft = this.formatTime(this.timeLeftSeconds);
      } else {
        this.autoSubmitExam('expired', 'Time Limit Reached.');
      }
    });
  }

  formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  
  goToQuestion(index: number): void {
    this.currentQuestionIndex = index;
  }
  
  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }
  
  handleAnswer(answer: any): void {
    const q = this.questions[this.currentQuestionIndex];
    q.studentAnswer = answer;
    const hasValue = q.questiontypeid === 1 ? answer !== null : (answer && answer.trim().length > 0);
    q.status = hasValue ? 'answered' : 'unanswered';
  }

  autoSubmitExam(status: 'submitted' | 'expired', customMessage?: string): void {
    if (this.isSubmitting) return; 
    this.isSubmitting = true;
    this.timerSubscription?.unsubscribe();

    const loginData = this.apiService.getStoredStudentData();
    const studentId = loginData?.userId || 'GUEST'; 
    
    const payload = {
      examid: this.examId!,
      userid: studentId,
      attemptdate: new Date().toISOString(),
      total_score: 0,
      ai_evaluated: false,
      updated_at: new Date().toISOString()
    };

    this.examService.createAttempt(payload).pipe(
      tap(res => this.attemptId = res.attemptid),
      concatMap(res => {
        const obs = this.questions.map(q => {
          if (q.studentAnswer !== null && q.studentAnswer !== '') {
            return this.examService.submitAnswer({
              attemptid: res.attemptid,
              questionid: q.questionid,
              selectedoptionid: q.questiontypeid === 1 ? q.studentAnswer : null,
              descriptive_answer: q.questiontypeid === 2 ? q.studentAnswer : null,
              code_answer: q.questiontypeid === 3 ? q.studentAnswer : null,
              is_correct: false,
              points_earned: 0
            }).pipe(catchError(() => of(null)));
          }
          return of(null);
        });
        return forkJoin(obs);
      }),
      concatMap(() => this.examService.evaluateAndFetchResult(this.attemptId!))
    ).subscribe({
      next: (res) => {
        this.finalResult = res;
        this.showResult = true;
        this.isSubmitting = false;
        if (this.attemptId) this.fetchResultsWithFeedback(this.attemptId);
      },
      error: () => {
        this.isSubmitting = false;
        this.examFinished.emit({ status, message: customMessage || 'Submitted' });
      }
    });
  }

  fetchResultsWithFeedback(id: number): void {
    this.examService.fetchDetailedAnswers(id).subscribe(ans => this.detailedAnswers = ans);
  }

  get answeredCount(): number { return this.questions.filter(q => q.status === 'answered').length; }
  get unansweredCount(): number { return this.questions.length - this.answeredCount; }
}