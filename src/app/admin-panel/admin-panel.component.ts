import { Component } from '@angular/core';
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent {
  constructor(private router: Router) { }

  // Create Student page par navigate karne ka function
  navigateToCreateStudent(): void {
    // '/create-student' route path par jaana hai.
    this.router.navigate(['/create-student']).catch(err => {
      console.error('Navigation Error: Could not navigate to /create-student. Please ensure this route is configured in your routing module.', err);
      
    });
  }
  
  navigateToTrainerForm():void{
    this.router.navigate(["/trainer-form"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /trainer-form. Please ensure this route is configured in your routing module.',err);
    }
    );
  }
  
  // NEW: Admin Form page par navigate karne ka function
  navigateToAdminForm(): void {
    this.router.navigate(["/admin-form"]).catch(err => {
      console.error('Navigation Error: Could not navigate to /admin-form. Please ensure this route is configured in your routing module.', err);
    });
  }

  navigateTocreatebatchForm():void{
   
    this.router.navigate(["/create-batch"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /create-batch. Please ensure this route is configured in your routing module.',err);
    }
    );
  }

  navigateTouploadJobForm():void{
    // Note: Assumed route is /upload-job.
    this.router.navigate(["/upload-job"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /upload-job. Please ensure this route is configured in your routing module.',err);
    }
    );
  }

  navigateToCreateExam(): void {
    this.router.navigate(["/create-exam"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /create-exam. Please ensure this route is configured in your routing module.',err);
    });
  }
}
