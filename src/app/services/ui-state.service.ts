import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  // Event Bus create kiya hai
  private actionSubject = new Subject<{ action: string, data?: any }>();
  public action$ = this.actionSubject.asObservable();

  constructor() { }

  // Footer se signal bhejne ke liye function
  triggerAction(action: string, data?: any) {
    this.actionSubject.next({ action, data });
  }
}