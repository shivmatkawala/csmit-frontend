import { Component } from '@angular/core';
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-admin-panel',
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.css']
})
export class AdminPanelComponent {
  constructor(private router: Router) { }

  navigateToCreateUser(): void {
    this.router.navigate(['/create-user']).catch(err => {
      console.error('Navigation Error: Could not navigate to /create-user. Please ensure this route is configured.', err);
    });
  }

  navigateTocreatebatchForm():void{
    this.router.navigate(["/create-batch"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /create-batch. Please ensure this route is configured.',err);
    });
  }
  
  navigateToCreateCourseForm():void{
    this.router.navigate(["/create-course"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /create-course. Please ensure this route is configured.',err);
    });
  }

  navigateTouploadJobForm():void{
    this.router.navigate(["/upload-job"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /upload-job. Please ensure this route is configured.',err);
    });
  }

  navigateToCreateExam(): void {
    this.router.navigate(["/create-exam"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /create-exam. Please ensure this route is configured.',err);
    });
  }
  
  navigateToAssignUserToBatch(): void {
    this.router.navigate(["/assign-user-to-batch"]).catch(err=>{
      console.error('Navigation Error: Could not navigate to /assign-user-to-batch. Please ensure this route is configured.',err);
    });
  }
}
