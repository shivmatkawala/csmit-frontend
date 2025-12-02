import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { examAPi } from '../services/createexam.service';
import { ApiService, LoginResponse} from '../services/api.service';
import { Subscription, interval, timer, forkJoin, of, Observable } from 'rxjs';
import { catchError, map, concatMap, tap } from 'rxjs/operators';

interface QuestionOption {
  optionid: number; 
  option_text: string;
}

interface ExamQuestion {
  questionid: number; 
  questiontext: string; 
  points: number;
  questiontypeid: number; // 1: MCQ, 2: Descriptive, 3: Coding
  options: QuestionOption[];
  studentAnswer: string | number | null; 
  status: 'unanswered' | 'answered' | 'marked';
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
  @Input() examName: string = 'Online Assessment';

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

  constructor(private examService: examAPi, private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.examId) {
      this.fetchExamQuestions(this.examId);
      this.timeLeftSeconds = this.durationMinutes * 60;
      this.startTimer();
    } else {
      this.error = 'Error: Exam ID is missing. Cannot start the exam.';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
  }
  
  fetchExamQuestions(examId: number): void {
    this.isLoading = true;
    this.error = null;
    
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
        this.error = 'Failed to load exam questions. Check console for API details.';
        this.isLoading = false;
        return of([]);
      })
    ).subscribe((questions: ExamQuestion[]) => {
      this.questions = questions;
      this.isLoading = false;
      if (this.questions.length === 0 && !this.error) {
        this.error = 'This exam contains no questions or questions could not be loaded.';
      }
    });
  }
  
  startTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.timeLeftSeconds > 0) {
        this.timeLeftSeconds--;
        this.formattedTimeLeft = this.formatTime(this.timeLeftSeconds);
      } else {
        this.timerSubscription?.unsubscribe();
        this.autoSubmitExam('expired');
      }
    });
  }

  formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num: number) => num < 10 ? '0' + num : num;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  
  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index;
    }
  }
  
  nextQuestion(): void {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.goToQuestion(this.currentQuestionIndex + 1);
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.goToQuestion(this.currentQuestionIndex - 1);
    }
  }
  
  handleAnswer(answer: string | number | null): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    currentQuestion.studentAnswer = answer;
    
    if (currentQuestion.status === 'marked') return;
    
    const isAnswered = currentQuestion.questiontypeid === 1 
      ? answer !== null && answer !== undefined 
      : answer && String(answer).trim().length > 0;
    
    currentQuestion.status = isAnswered ? 'answered' : 'unanswered';
  }
  
  onMcqSelect(optionId: number): void {
    this.handleAnswer(optionId);
  }
  
  onTextChange(text: string): void {
      this.handleAnswer(text);
  }

  markForReview(): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (currentQuestion.status === 'marked') {
        const isAnswered = currentQuestion.questiontypeid === 1 
            ? currentQuestion.studentAnswer !== null && currentQuestion.studentAnswer !== undefined 
            : currentQuestion.studentAnswer && String(currentQuestion.studentAnswer).trim().length > 0;

        currentQuestion.status = isAnswered ? 'answered' : 'unanswered';
    } else {
        currentQuestion.status = 'marked';
    }
  }
  
  submitExam(): void {
    this.autoSubmitExam('submitted');
  }

  autoSubmitExam(status: 'submitted' | 'expired'): void {
    if (this.isSubmitting) return; 

    this.timerSubscription?.unsubscribe();
    this.isSubmitting = true;

    const loginData: LoginResponse | null = this.apiService.getStoredStudentData();
    const studentId: string = loginData?.userId || 'GUEST_USER'; 
    
    const attemptPayload = {
      examid: this.examId!,
      userid: studentId,
      attemptdate: new Date().toISOString(),
      total_score: 0.00,
      ai_evaluated: false, 
      updated_at: new Date().toISOString()
    };
    
    this.error = 'Submitting Exam... Please wait.';

    this.examService.createAttempt(attemptPayload).pipe(
      tap(attemptRes => {
        this.attemptId = attemptRes.attemptid; 
      }),
      concatMap(attemptRes => {
        const attemptId = attemptRes.attemptid;
        
        const answerRequests: Observable<any>[] = this.questions.map(q => {
          const isMCQ = q.questiontypeid === 1;
          const isDescriptive = q.questiontypeid === 2;
          const isCoding = q.questiontypeid === 3;
          
          const hasAnswer = q.studentAnswer !== null && q.studentAnswer !== undefined && 
                           (typeof q.studentAnswer !== 'string' || String(q.studentAnswer).trim().length > 0);
          
          if (hasAnswer) {
              const answerPayload = {
                attemptid: attemptId,
                questionid: q.questionid,
                selectedoptionid: isMCQ ? q.studentAnswer : null, 
                descriptive_answer: isDescriptive ? q.studentAnswer : null,
                code_answer: isCoding ? q.studentAnswer : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_correct: false, 
                points_earned: 0.00
              };
              
              return this.examService.submitAnswer(answerPayload).pipe(
                catchError(err => {
                  return of({ success: false, questionid: q.questionid, error: err });
                })
              );
          } else {
              return of({ success: true, questionid: q.questionid, message: 'No answer provided' });
          }
        });
        
        return forkJoin(answerRequests).pipe(
          map(() => attemptId)
        );
      }),
      
      concatMap(attemptId => {
        this.error = 'Evaluator running...';
        return this.examService.evaluateAndFetchResult(attemptId).pipe(
             catchError(err => {
                return of({ 
                    attemptid: attemptId, 
                    total_score: 0,
                    max_score: 0,
                    status_message: 'Result fetch warning. Feedback might be delayed.'
                } as AttemptResult);
             })
        );
      }),

      catchError(err => {
        this.isSubmitting = false;
        this.error = `Submission failed. ${err.message || 'API Error'}`;
        this.examFinished.emit({
          status: 'submitted',
          message: this.error 
        });
        return of(null);
      })
      
    ).subscribe({
      next: (result: AttemptResult | null) => {
        if (result !== null) {
          this.isSubmitting = false;
          this.error = null; 
          
          this.finalResult = result;
          this.showResult = true; 
          
          // Auto fetch detailed feedback immediately
          if (this.attemptId) {
            this.fetchResultsWithFeedback(this.attemptId);
          }
        }
      }
    });
  }
  
  fetchResultsWithFeedback(attemptId: number): void {
      this.examService.fetchDetailedAnswers(attemptId).pipe(
          catchError(err => {
              console.error("Failed to fetch detailed answers:", err);
              return of([]); 
          })
      ).subscribe(answers => {
          this.detailedAnswers = answers;
      });
  }

  exitResultView(): void {
    this.examFinished.emit({
        status: 'submitted',
        message: 'Exam completed.'
    });
  }

  get answeredCount(): number {
    return this.questions.filter(q => q.status === 'answered').length;
  }
  
  get markedCount(): number {
    return this.questions.filter(q => q.status === 'marked').length;
  }
  
  get unansweredCount(): number {
    return this.questions.length - (this.answeredCount + this.markedCount);
  }
  
  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === this.questions.length - 1;
  }
}