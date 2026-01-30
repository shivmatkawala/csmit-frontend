import {
  Component,
  ElementRef,
  ViewChild,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CodeExecutionService } from 'src/app/services/code-execution.service';

declare const monaco: any;

@Component({
  selector: 'app-code-editor',
  templateUrl: './code-editor.component.html',
  styleUrls: ['./code-editor.component.css']
})
export class CodeEditorComponent implements OnInit, OnDestroy {

  constructor(private executor: CodeExecutionService) {}

  /* ---------------- Monaco & Language ---------------- */

  languages = [
    { label: 'TypeScript', value: 'typescript' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'Python', value: 'python' },
    { label: 'C++', value: 'cpp' },
    { label: 'Java', value: 'java' }
  ];

  selectedLanguage = this.languages[0];
  isOpen = false;
  isRunning = false;
  lastRunStatus: 'idle' | 'success' | 'error' = 'idle';

  code = `function codexa() {
  console.log("Welcome to Codexa IDE 🚀");
}`;

  output = '';
  editor: any;

  editorOptions = {
    theme: 'vs-dark',
    language: this.selectedLanguage.value,
    automaticLayout: true,
    fontSize: 14,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    roundedSelection: true,
    padding: { top: 10 }
  };

  ngOnInit() {
    // Initial setup if needed
  }

  onEditorInit(editor: any) {
    this.editor = editor;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectLanguage(lang: any) {
    this.selectedLanguage = lang;
    this.isOpen = false;
    this.changeLanguage();
  }

  changeLanguage() {
    if (this.editor) {
      monaco.editor.setModelLanguage(
        this.editor.getModel(),
        this.selectedLanguage.value
      );
    }
  }

  /* ---------------- Code Execution ---------------- */

  runCode() {
    this.output = 'Initializing execution engine...\n';
    this.isRunning = true;
    this.lastRunStatus = 'idle';

    this.executor.runCode({
      language: this.selectedLanguage.value,
      code: this.code
    }).subscribe({
      next: (res) => {
        const result = res.stdout || res.output || res.stderr || '✓ Execution completed (No output)';
        this.output = result;
        this.isRunning = false;
        this.lastRunStatus = res.stderr ? 'error' : 'success';
      },
      error: (err) => {
        this.output = 'Fatal Error: Failed to reach code execution server.';
        this.isRunning = false;
        this.lastRunStatus = 'error';
        console.error(err);
      }
    });
  }

  /* ---------------- Resize Logic ---------------- */

  @ViewChild('editorArea', { static: true })
  editorArea!: ElementRef<HTMLDivElement>;

  @ViewChild('terminalBox', { static: true })
  terminalBox!: ElementRef<HTMLDivElement>;

  private isResizing = false;
  private startY = 0;
  private startEditorHeight = 0;
  private startTerminalHeight = 0;

  startResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
    this.startY = event.clientY;
    this.startEditorHeight = this.editorArea.nativeElement.offsetHeight;
    this.startTerminalHeight = this.terminalBox.nativeElement.offsetHeight;

    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResize);
  }

  resize = (event: MouseEvent) => {
    if (!this.isResizing) return;
    const delta = event.clientY - this.startY;
    const newEditorHeight = this.startEditorHeight + delta;
    const newTerminalHeight = this.startTerminalHeight - delta;

    if (newEditorHeight < 150 || newTerminalHeight < 80) return;

    this.editorArea.nativeElement.style.height = `${newEditorHeight}px`;
    this.terminalBox.nativeElement.style.height = `${newTerminalHeight}px`;
    this.editor?.layout();
  };

  stopResize = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };

  ngOnDestroy() {
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  }
}