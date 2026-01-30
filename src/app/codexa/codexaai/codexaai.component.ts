import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { CodexaChatService } from 'src/app/codexaservice/codexa-chat.service';
import { QuestionStateService } from 'src/app/codexaservice/question-state.service';

interface ChatMessage {
  role: 'user' | 'codexa';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-codexaai',
  templateUrl: './codexaai.component.html',
  styleUrls: ['./codexaai.component.css']
})
export class CodexaaiComponent {
  message = '';
  hasText = false;
  isLoading = false;
  chatHistory: ChatMessage[] = [];

  constructor(
    private codexaService: CodexaChatService,
    private questionState: QuestionStateService,
    private sanitizer: DomSanitizer
  ) {
    // Initial greeting message
    this.chatHistory.push({
      role: 'codexa',
      content: 'Hello! I am your AI assistant. How can I help you with your coding tasks today?',
      timestamp: new Date()
    });
  }

  /**
   * Updates state when user types to enable/disable send button
   */
  onInputChange() {
    this.hasText = this.message.trim().length > 0;
  }

  /**
   * Handles sending a message to the AI service
   */
  sendMessage() {
    const userMsg = this.message.trim();
    if (!userMsg || this.isLoading) return;

    // Add user message to history
    this.chatHistory.push({ 
      role: 'user', 
      content: userMsg, 
      timestamp: new Date() 
    });

    this.message = '';
    this.hasText = false;
    this.isLoading = true;

    this.codexaService.sendMessage({
      message: userMsg,
      question: '',
      code: ''
    }).subscribe({
      next: (res) => {
        const reply = res.reply || '';
        
        // Add AI response to chat history
        this.chatHistory.push({ 
          role: 'codexa', 
          content: reply, 
          timestamp: new Date() 
        });

        // Determine if the reply contains a coding challenge or practice question
        const userWantsQuestion = userMsg.toLowerCase().match(/(question|practice|problem|task|challenge|exercise|generate)/);
        const aiGaveQuestion = res.type === 'question' || reply.toLowerCase().includes('problem statement') || reply.toLowerCase().includes('coding challenge');

        if (userWantsQuestion || aiGaveQuestion) {
          // Clean conversational filler and redundant headers before sending to the side panel
          const cleanedQuestion = this.cleanQuestionText(reply);
          this.questionState.setQuestion(cleanedQuestion);
        }

        this.isLoading = false;
        this.scrollToBottom();
      },
      error: () => {
        this.chatHistory.push({
          role: 'codexa',
          content: 'I am sorry, but an error occurred. Please check your connection and try again.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  /**
   * Filters out conversational text, repetitive headers, and unwanted phrases for the Question Box
   */
  private cleanQuestionText(text: string): string {
    return text
      // Remove specific headers (case insensitive)
      .replace(/#*\s*Coding Challenge[:\s]*/gi, '')
      .replace(/#*\s*Problem Statement[:\s]*/gi, '')
      // Remove conversational fillers
      .replace(/Sure! Here’s a .* question for you:?/gi, '')
      .replace(/Here is your coding challenge:?/gi, '')
      .replace(/I have generated a .* for you:?/gi, '')
      .replace(/Ask Codexa to generate a programming question\.?/gi, '')
      // Remove any leftover triple hashes or bold prefixes if they become empty headers
      .replace(/^#+\s*\n/gm, '')
      .replace(/^\*\*Problem Statement\*\*\n?/gi, '')
      .trim();
  }

  /**
   * Scrolls the chat container to the bottom after new messages
   */
  private scrollToBottom() {
    setTimeout(() => {
      const chatArea = document.querySelector('.chat-area');
      if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }, 100);
  }

  /**
   * Parses markdown and returns sanitized HTML for the chat bubble
   */
  formatMessage(content: string) {
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Clears the chat history and resets with a fresh greeting
   */
  clearChat() {
    this.chatHistory = [{
      role: 'codexa',
      content: 'Chat history has been cleared. How else can I assist you?',
      timestamp: new Date()
    }];
  }
}