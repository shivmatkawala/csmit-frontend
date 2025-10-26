import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { CreateStudentComponent } from './create-student/create-student.component';
import { TrainerFormComponent } from './trainer-form/trainer-form.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { CreateBatchComponent } from './create-batch/create-batch.component';
import { UploadJobComponent } from './upload-job/upload-job.component';
import { CreateExamComponent } from './create-exam/create-exam.component';
import { GenerateAtsResumeComponent } from './generate-ats-resume/generate-ats-resume.component';
import { AdminFormComponent } from './admin-panel/admin-form/admin-form.component';
import { CreateCourseComponent } from './create-course/create-course.component';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
const routes: Routes = [
  { path: '', redirectTo: 'landing-page', pathMatch: 'full' },
  {path:'landing-page',component:LandingPageComponent},
  {path:'login',component:LoginFormComponent},
  {path:'admin-panel',component:AdminPanelComponent},
  {path:'create-student', component:CreateStudentComponent},
  {path:'trainer-form',component:TrainerFormComponent},
  {path:'chatbot',component:ChatbotComponent},
  {path:'student-dashboard',component:StudentDashboardComponent},
  {path:'trainer-dashboard',component:TrainerDashboardComponent},
  {path: 'generate-ats-resume', component: GenerateAtsResumeComponent},
  {path:'create-batch',component:CreateBatchComponent},
  {path:'upload-job',component:UploadJobComponent},
  {path:'create-exam',component:CreateExamComponent},
  {path:'admin-form',component:AdminFormComponent},
  {path:'create-course',component:CreateCourseComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
