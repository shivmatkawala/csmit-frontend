import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  // Default timer increased to 4000ms (4 seconds) as requested
  success(message: string, title: string = 'Success', timer: number = 4000) {
    Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  error(message: string, title: string = 'Error', timer: number = 4000) {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  warning(message: string, title: string = 'Warning', timer: number = 4000) {
    Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  info(message: string, title: string = 'Info', timer: number = 4000) {
    Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonText: 'OK',
      timer: timer,
      timerProgressBar: true
    });
  }

  // Confirmation Dialog helper
  confirm(title: string, text: string, confirmButtonText: string = 'Yes, delete it!'): Promise<any> {
    return Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: confirmButtonText
    });
  }

  validation(message: string, title: string = 'Invalid Input') {
    Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonColor: '#f39c12',
      confirmButtonText: 'Got it',
      timer: 5000, // Validation messages slightly longer
      timerProgressBar: true
    });
  }
}