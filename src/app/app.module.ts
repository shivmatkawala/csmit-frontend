import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CreateStudentComponent } from './create-student/create-student.component';
// import { GenerateAtsResumeComponent } from './generate-ats-resume/generate-ats-resume.component'; // NOTE: Commented out if already imported globally
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { HeaderComponent } from './header/header.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SectionComponent } from './section/section.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { FooterComponent } from './footer/footer.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
// import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component'; // NOTE: Commented out if already imported globally
import { ProfileSettingComponent } from './student-dashboard/profile-setting/profile-setting.component';
import { CreateCourseComponent } from './create-course/create-course.component';
import { AboutCsmitComponent } from './about-csmit/about-csmit.component';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
import { CreateUserComponent } from './create-user/create-user.component';
import { AssignUserToBatchComponent } from './assign-user-to-batch/assign-user-to-batch.component';
import { CreateJobComponent } from './create-job/create-job.component';
import { CreateExamComponent } from './createexam/createexam.component';
import { CreateBatchComponent } from './create-batch/create-batch.component';
import { AttendExamComponent } from './attend-exam/attend-exam.component';
import { UserManagementComponent } from './admin-panel/user-management/user-management.component';
import { ManageCourseComponent } from './admin-panel/manage-course/manage-course.component';
import { BatchManagementComponent } from './admin-panel/batch-management/batch-management.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { GenerateAtsResumeComponent } from './generate-ats-resume/generate-ats-resume.component';
import { CommonModule } from '@angular/common';
import { CourseBatchManagementComponent } from './student-dashboard/course-batch-management/course-batch-management.component';
import { ContactComponent } from './contact/contact.component';
import { CreateSuccessStoryComponent } from './admin-panel/create-success-story/create-success-story.component';
import { BlogComponent } from './blog/blog.component';
import { UploadBlogComponent } from './admin-panel/upload-blog/upload-blog.component';

@NgModule({
  declarations: [
    AppComponent,
    CreateStudentComponent,
    LandingPageComponent,
    HeaderComponent,
    NavbarComponent,
    SectionComponent,
    LoginFormComponent,
    AdminPanelComponent,
    FooterComponent,
    ChatbotComponent,
    ProfileSettingComponent,
    CreateCourseComponent,
    AboutCsmitComponent,
    TrainerDashboardComponent,
    CreateUserComponent,
    AssignUserToBatchComponent,
    CreateJobComponent,
    CreateExamComponent,
    CreateBatchComponent,
    AttendExamComponent,
    UserManagementComponent,
    ManageCourseComponent,
    BatchManagementComponent,
    StudentDashboardComponent,
    GenerateAtsResumeComponent,
    CourseBatchManagementComponent,
    ContactComponent,
    CreateSuccessStoryComponent,
    BlogComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule, // <-- FIX 1: Fixes [formControl] and FormGroup errors
    HttpClientModule,
    FormsModule,
    CommonModule, 
    UploadBlogComponent
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }