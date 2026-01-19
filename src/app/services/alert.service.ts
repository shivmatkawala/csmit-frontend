import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  success(message: string, title: string = 'Success', timer: number = 2000) {
    Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  error(message: string, title: string = 'Error', timer: number = 2000) {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  warning(message: string, title: string = 'Warning', timer: number = 2000) {
    Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  info(message: string, title: string = 'Info', timer: number = 2000) {
    Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  // --- NEW: Dedicated Validation Alert ---
  validation(message: string, title: string = 'Invalid Input') {
    Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonColor: '#f39c12', // distinct orange color for validation
      confirmButtonText: 'Got it',
      timer: 3000,
      timerProgressBar: true
    });
  }
}