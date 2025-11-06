import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { examAPi } from '../services/createexam.service';
import { Subscription, interval, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

// --- Interfaces for Question Structure from API ---
interface QuestionOption {
  // FIX: API response field name: optionid
  optionid: number; 
  option_text: string;
}

interface ExamQuestion {
  // FIX: API response field name: questionid
  questionid: number; 
  // FIX: API response field name: questiontext
  questiontext: string; 
  points: number;
  // FIX: API response field name: questiontypeid
  questiontypeid: number; // 1: MCQ, 2: Descriptive, 3: Coding
  options: QuestionOption[]; // Only for MCQ
  // Client-side tracking fields
  studentAnswer: string | number | null; // Holds selected optionid (MCQ) or text (Descriptive/Coding)
  status: 'unanswered' | 'answered' | 'marked';
}

@Component({
  selector: 'app-attend-exam',
  templateUrl: './attend-exam.component.html',
  styleUrls: ['./attend-exam.component.css']
})
export class AttendExamComponent implements OnInit, OnDestroy {
  @Input() examId: number | null = null;
  @Input() durationMinutes: number = 60; // Dashboard से प्राप्त
  @Input() examName: string = 'Online Assessment';

  @Output() examFinished = new EventEmitter<{ status: 'submitted' | 'expired', message: string }>();
  
  // State
  isLoading: boolean = true;
  error: string | null = null;
  
  // Exam Data
  questions: ExamQuestion[] = [];
  currentQuestionIndex: number = 0;
  
  // Timer & Control
  timeLeftSeconds: number = 0;
  timerSubscription: Subscription | undefined;
  formattedTimeLeft: string = '00:00:00';

  constructor(private examService: examAPi) {}

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
        // प्रश्न डेटा को ExamQuestion इंटरफ़ेस के अनुसार मैप करें
        return res.map(q => ({
          // FIX: API response field name का उपयोग करें
          questionid: q.questionid,
          questiontext: q.questiontext,
          points: q.points,
          questiontypeid: q.questiontypeid,
          // FIX: options के अंदर option_id की जगह optionid का उपयोग करें
          options: (q.options || []).map((opt: any) => ({
             optionid: opt.optionid, 
             option_text: opt.optiontext // API response field name
          })),
          studentAnswer: q.questiontypeid === 1 ? null : '', // MCQ के लिए null, बाकी के लिए खाली स्ट्रिंग
          status: 'unanswered'
        } as ExamQuestion));
      }),
      catchError(err => {
        this.error = 'Failed to load exam questions. Check console for API details.';
        this.isLoading = false;
        console.error('Error fetching questions:', err);
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
  
  /**
   * टाइमर लॉजिक शुरू करना
   */
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

  /**
   * समय को HH:MM:SS फॉर्मेट करना
   */
  formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const pad = (num: number) => num < 10 ? '0' + num : num;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  
  /**
   * प्रश्न नेविगेशन
   */
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
  
  /**
   * छात्र के उत्तर को संभालना और स्थिति अपडेट करना
   * @param answer - MCQ के लिए optionid, या Descriptive/Coding के लिए उत्तर टेक्स्ट
   */
  handleAnswer(answer: string | number | null): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    currentQuestion.studentAnswer = answer;
    
    // Status update logic
    if (currentQuestion.status === 'marked') return; // Marked questions should remain marked
    
    if (currentQuestion.questiontypeid === 1) {
        // MCQ: उत्तर null (unanswered) या optionid (answered)
        currentQuestion.status = answer !== null && answer !== undefined ? 'answered' : 'unanswered';
    } else {
        // Descriptive/Coding: उत्तर खाली स्ट्रिंग या टेक्स्ट
        currentQuestion.status = answer && String(answer).trim().length > 0 ? 'answered' : 'unanswered';
    }
  }
  
  // MCQ रेडियो बटन चेंज इवेंट को संभालना
  onMcqSelect(optionId: number): void {
    this.handleAnswer(optionId);
  }
  
  // Descriptive/Coding इनपुट चेंज इवेंट को संभालना
  onTextChange(text: string): void {
      this.handleAnswer(text);
  }


  
  markForReview(): void {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (currentQuestion.status === 'marked') {
        // Unmark
        currentQuestion.status = currentQuestion.studentAnswer !== null && currentQuestion.studentAnswer !== undefined && (currentQuestion.questiontypeid === 1 || String(currentQuestion.studentAnswer).trim().length > 0) ? 'answered' : 'unanswered';
    } else {
        // Mark
        currentQuestion.status = 'marked';
    }
  }
  
  
  submitExam(): void {
    // FIX: Confirm box को custom modal से बदलें (यहाँ console log का उपयोग किया गया है)
    console.log('--- Custom Confirmation Modal Needed ---');
    
    const confirmation = true; // Simulating confirmation
    
    if (confirmation) {
      this.autoSubmitExam('submitted');
    }
  }

  /**
   * अंतिम पेलोड तैयार करना और डैशबोर्ड को इवेंट एमिट करना
   */
  autoSubmitExam(status: 'submitted' | 'expired'): void {
    this.timerSubscription?.unsubscribe();
    
    const studentId = 'USER_ID_PLACEHOLDER'; 

    
    const answersPayload = this.questions.map(q => ({
      questionid: q.questionid,
      // MCQ (1): studentAnswer में optionid होगा
      mcq_answer_option_id: q.questiontypeid === 1 ? q.studentAnswer : null, 
      // Descriptive/Coding (2, 3): studentAnswer में टेक्स्ट होगा
      text_answer: q.questiontypeid !== 1 ? q.studentAnswer : null,
    }));

    const finalPayload = {
      exam_id: this.examId,
      user_id: studentId,
      answers: answersPayload
    };
    
    console.log('--- FINAL SUBMISSION PAYLOAD ---', finalPayload);
    
    this.examFinished.emit({
        status: status,
        message: status === 'submitted' 
            ? 'Exam submitted successfully! Results will be available soon.' 
            : 'Time expired. Exam automatically submitted.'
    });
  }

  // Question summary status counts
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