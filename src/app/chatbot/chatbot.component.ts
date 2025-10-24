import { Component } from '@angular/core';
import { ChatService } from '../services/chat.service';


@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent {
  messages: { text: string, sender: string }[] = [];
  userInput: string = '';

  constructor(private chatService: ChatService) {}

  sendMessage() {
    if (!this.userInput.trim()) return;

    this.messages.push({ text: this.userInput, sender: 'user' });

    this.chatService.sendMessage(this.userInput).subscribe(response => {
      this.messages.push({ text: response.reply, sender: 'bot' });
    });

    this.userInput = '';
  }
}