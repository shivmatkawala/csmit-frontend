import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = localStorage.getItem('access_token');
    
    // 1. Check if the URL is for AWS S3. If yes, DO NOT attach the token.
    const isS3Url = request.url.includes('s3.ap-south-2.amazonaws.com') || request.url.includes('amazonaws.com');

    if (token && !isS3Url) {
      // Sirf tabhi token add karein jab S3 URL NA ho
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // 2. Original error handling logic (Logout on 401)
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}