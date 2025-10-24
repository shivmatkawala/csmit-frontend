import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

// --- Data Structures ---

/** Defines the structure for a single multiple-choice option. */
interface Option {
  id: string;
  text: string;
}

/** Defines the structure for a single question (currently only MCQ is supported). */
export interface Question {
  id: string;
  type: 'MCQ'; 
  text: string;
  options: Option[];
  correctOptionId: string | null;
  marks: number | null; 
}

/** Defines the top-level structure of the entire exam. */
export interface Exam {
  title: string;
  description: string;
  durationMinutes: number | null;
  questions: Question[];
}

// --- Component Definition ---

@Component({
  selector: 'app-create-exam',
  // Note: We reference the separate HTML and CSS files here
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.css'],
  // Using OnPush for better performance, although we rely on array reference change for detection
  changeDetection: ChangeDetectionStrategy.OnPush, 
})
export class CreateExamComponent {
  // Dependency Injection
  private location = inject(Location);

  // Main Exam Data Model
  exam: Exam = {
    title: 'New Mock Exam Title',
    description: 'Set a brief description or general instructions for your test here.',
    durationMinutes: 60,
    questions: [
      // Mock question for initial display
      {
        id: crypto.randomUUID(),
        type: 'MCQ',
        text: 'What Angular concept enhances change detection efficiency by checking component inputs only?',
        options: [
          { id: 'opt1', text: 'OnPush Strategy' },
          { id: 'opt2', text: 'Reactive Forms' },
          { id: 'opt3', text: 'Pipes' },
        ],
        correctOptionId: 'opt1',
        marks: 5,
      },
    ],
  };

  // State for Question Editor Modal
  isEditorVisible = signal(false);
  isEditMode = signal(false);
  
  // State for Dragging functionality (Index of the question currently being dragged)
  draggedIndex = signal<number | null>(null); 

  // Current question object being edited/added in the modal
  currentQuestion: Question = this.getNewQuestionTemplate();
  originalQuestionId: string | null = null; 

  // Computed property to calculate total marks in real-time
  totalMarks = computed(() => {
    return this.exam.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  });
  
  // --- Utility Functions ---

  /** Generates a unique ID for a new option. */
  private getNewOptionId(): string {
    return 'opt' + Math.random().toString(36).substring(2, 6);
  }

  /** Returns a default, blank question template. */
  private getNewQuestionTemplate(): Question {
    const id = crypto.randomUUID();
    const options: Option[] = [
      { id: this.getNewOptionId(), text: 'Option A' },
      { id: this.getNewOptionId(), text: 'Option B' },
    ];
    return {
      id: id,
      type: 'MCQ',
      text: 'Untitled Question',
      options: options,
      correctOptionId: null,
      marks: 2, // Default marks
    };
  }
  
  /** Maps an Option ID to its corresponding letter (A, B, C...). */
  getOptionLetter(optionId: string, question: Question): string {
    const index = question.options.findIndex(opt => opt.id === optionId);
    return index > -1 ? String.fromCharCode(65 + index) : '';
  }

  // --- Exam Actions ---

  /** Saves the exam data (Mock function). */
  saveExam(form: NgForm): void {
    if (form.invalid || this.exam.questions.length === 0) {
        console.error("Validation failed: Please complete exam details and add at least one question.");
        return;
    }

    console.log('--- Exam Data Ready for Submission (Mock) ---');
    console.log('Exam Title:', this.exam.title);
    console.log('Total Questions:', this.exam.questions.length);
    console.log('Total Marks:', this.totalMarks());
    // In a real application, you would send this.exam data to a backend service.
  }

  goBack(): void {
    // Navigates back in history (mocked in this environment)
    console.log('Navigating back...');
  }

  // --- Question Editor Logic ---

  /** Opens the modal for adding a new question or editing an existing one. */
  openQuestionEditor(question: Question | null): void {
    if (question) {
      // Edit mode: Deep copy to isolate changes from the main list
      this.currentQuestion = JSON.parse(JSON.stringify(question));
      this.originalQuestionId = question.id;
      this.isEditMode.set(true);
    } else {
      // New mode
      this.currentQuestion = this.getNewQuestionTemplate();
      this.originalQuestionId = null;
      this.isEditMode.set(false);
    }
    this.isEditorVisible.set(true);
  }

  /** Closes the modal and resets the current question state. */
  closeQuestionEditor(): void {
    this.isEditorVisible.set(false);
    this.currentQuestion = this.getNewQuestionTemplate();
    this.originalQuestionId = null;
  }

  /** Adds a new blank option to the current question being edited. */
  addOption(): void {
    if (this.currentQuestion.options.length < 5) {
      this.currentQuestion.options.push({ id: this.getNewOptionId(), text: `Option ${this.currentQuestion.options.length + 1}` });
    }
  }

  /** Removes an option from the current question being edited. */
  removeOption(optionId: string): void {
    // Must maintain at least 2 options
    if (this.currentQuestion.options.length > 2) {
      const index = this.currentQuestion.options.findIndex(opt => opt.id === optionId);
      if (index > -1) {
        this.currentQuestion.options.splice(index, 1);
        
        // Reset correct option if the removed one was selected
        if (this.currentQuestion.correctOptionId === optionId) {
            this.currentQuestion.correctOptionId = null;
        }
        // Force array update to refresh option letters in the template
        this.currentQuestion.options = [...this.currentQuestion.options];
      }
    }
  }

  /** Saves the question data from the modal back into the main exam list. */
  saveQuestion(form: NgForm): void {
    const questionData = this.currentQuestion;

    // Custom validation check
    const optionsValid = !questionData.options.some(opt => !opt.text || opt.text.trim() === '');
    const correctOptionSelected = !!questionData.correctOptionId;

    if (form.invalid || !optionsValid || !correctOptionSelected) {
        console.error("Question validation failed.");
        Object.keys(form.controls).forEach(key => form.controls[key].markAsTouched());
        return;
    }
    
    // Create a new copy of the saved question (final version)
    const savedQuestion: Question = JSON.parse(JSON.stringify(questionData));
    let updatedQuestions = [...this.exam.questions];

    if (this.isEditMode() && this.originalQuestionId) {
        // Update existing question
        const index = updatedQuestions.findIndex(q => q.id === this.originalQuestionId);
        if (index > -1) {
          updatedQuestions[index] = savedQuestion;
        }
    } else {
        // Add new question
        savedQuestion.id = crypto.randomUUID();
        updatedQuestions.push(savedQuestion);
    }
    
    this.exam.questions = updatedQuestions; // Update array reference to trigger change detection
    this.closeQuestionEditor();
  }
  
  /** Removes a question from the exam list by ID. */
  deleteQuestion(id: string): void {
    this.exam.questions = this.exam.questions.filter(q => q.id !== id);
    console.log('Question Deleted:', id);
  }

  /** Adds a new question card and opens the editor immediately. */
  addQuestionCard(): void {
    const newQuestion = this.getNewQuestionTemplate();
    this.exam.questions.push(newQuestion);
    this.exam.questions = [...this.exam.questions]; // Force update

    // Open the editor immediately for the new question
    this.openQuestionEditor(newQuestion);
  }
  
  // --- New Functionality: Question Duplication ---

  /** Creates a deep copy of a question with new unique IDs. */
  duplicateQuestion(question: Question): void {
    // 1. Deep clone the question
    const newQuestion: Question = JSON.parse(JSON.stringify(question));

    // 2. Generate new IDs for the question and its options
    newQuestion.id = crypto.randomUUID();
    const oldToNewIdMap = new Map<string, string>();

    newQuestion.options = newQuestion.options.map(opt => {
      const newId = this.getNewOptionId();
      oldToNewIdMap.set(opt.id, newId);
      return { ...opt, id: newId };
    });
    
    // 3. Update the correctOptionId reference using the new Option IDs
    if (question.correctOptionId && oldToNewIdMap.has(question.correctOptionId)) {
      newQuestion.correctOptionId = oldToNewIdMap.get(question.correctOptionId)!;
    } else {
      newQuestion.correctOptionId = null;
    }

    // 4. Insert the new question right after the original
    const index = this.exam.questions.findIndex(q => q.id === question.id);
    if (index > -1) {
      this.exam.questions.splice(index + 1, 0, newQuestion);
      this.exam.questions = [...this.exam.questions]; // Force array update
      console.log('Question Duplicated:', newQuestion.id);
    }
  }

  // --- New Functionality: Drag and Drop Reordering ---
  // Using native drag events since Angular's CDK is not available in this environment.

  /** Initiates the drag operation by storing the starting index. */
  startDrag(index: number): void {
    this.draggedIndex.set(index);
  }

  /** Cleans up the drag state when dragging ends. */
  endDrag(): void {
    this.draggedIndex.set(null);
  }

  /** Handles the drop event to reorder the questions array. */
  drop(dropIndex: number): void {
    const draggedIndex = this.draggedIndex();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      this.draggedIndex.set(null);
      return;
    }

    const questions = [...this.exam.questions];
    
    // 1. Remove the dragged item
    const [draggedItem] = questions.splice(draggedIndex, 1);
    
    // 2. Insert it at the new drop location
    questions.splice(dropIndex, 0, draggedItem);
    
    // 3. Update the main array reference
    this.exam.questions = questions; 

    this.draggedIndex.set(null);
    console.log('Question Reordered from', draggedIndex + 1, 'to', dropIndex + 1);
  }
}
