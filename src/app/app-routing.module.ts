import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { TrainerFormComponent } from './trainer-form/trainer-form.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { CreateBatchComponent } from './create-batch/create-batch.component';
import { GenerateAtsResumeComponent } from './generate-ats-resume/generate-ats-resume.component';
import { CreateCourseComponent } from './create-course/create-course.component';
import { CreateUserComponent } from './create-user/create-user.component';
import { AssignUserToBatchComponent } from './assign-user-to-batch/assign-user-to-batch.component';
import { CreateJobComponent } from './create-job/create-job.component';
import { CreateExamComponent } from './createexam/createexam.component';
import { AttendExamComponent } from './attend-exam/attend-exam.component';
import { ContactComponent } from './contact/contact.component';
import { CreateSuccessStoryComponent } from './admin-panel/create-success-story/create-success-story.component';
import { BlogComponent } from './blog/blog.component';
import { UploadBlogComponent } from './admin-panel/upload-blog/upload-blog.component';
import { UploadNotesComponent } from './upload-notes/upload-notes.component';
import { CareersComponent } from './careers/careers.component';
import { SyntaxshareComponent } from './syntaxshare/syntaxshare.component';
import { JobApplicationComponent } from './job-application/job-application.component';
import { HomeComponent } from './codexa/home/home.component';
import { CourseBatchManagementComponent } from './course-batch-management/course-batch-management.component';
import { SetupProfileComponent } from './setup-profile/setup-profile.component';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
const routes: Routes = [
  { path: '', redirectTo: 'landing-page', pathMatch: 'full' },
  {path:'landing-page',component:LandingPageComponent},
  {path:'login',component:LoginFormComponent},
  {path:'admin-panel',component:AdminPanelComponent},
  {path:'setup-profile', component:SetupProfileComponent},
  {path:'trainer-form',component:TrainerFormComponent},
  {path:'chatbot',component:ChatbotComponent},
  {path:'student-dashboard',component:StudentDashboardComponent},
  {path: 'generate-ats-resume', component: GenerateAtsResumeComponent},
  {path:'create-batch',component:CreateBatchComponent},
  {path:'create-course',component:CreateCourseComponent},
  {path:'trainer-dashboard',component:TrainerDashboardComponent},
  {path:'create-user',component:CreateUserComponent},
  {path:'assign-user-to-batch',component:AssignUserToBatchComponent},
  {path:'create-job',component:CreateJobComponent},
  {path:'create-exam',component:CreateExamComponent},
  {path:'attend-exam',component:AttendExamComponent},
  { path: 'contact', component: ContactComponent },
  {path:'create-success-story',component:CreateSuccessStoryComponent},
  {path:'job-application',component:JobApplicationComponent},
  {path:'blog',component:BlogComponent},
  {path:'upload-blog',component:UploadBlogComponent},
  {path:'upload-notes',component:UploadNotesComponent},
  {path:'careers',component:CareersComponent},
  {path:'course-batch-management',component:CourseBatchManagementComponent},
  {path:'syntaxshare',component:SyntaxshareComponent},
  {path:'home',component:HomeComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
