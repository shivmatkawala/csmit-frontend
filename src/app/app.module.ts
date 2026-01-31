import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CreateStudentComponent } from './setup-profile/setup-profile.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { HeaderComponent } from './header/header.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SectionComponent } from './section/section.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { FooterComponent } from './footer/footer.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
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
import { UploadNotesComponent } from './upload-notes/upload-notes.component';
import { CareersComponent } from './careers/careers.component';
import { UploadCareerComponent } from './upload-careers/upload-careers.component';
import { JobApplicationComponent } from './job-application/job-application.component';
import { SyntaxshareComponent } from './syntaxshare/syntaxshare.component';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { HomeComponent } from './codexa/home/home.component';
import { CodexaaiComponent } from './codexa/codexaai/codexaai.component';
import { QuestionsComponent } from './codexa/questions/questions.component';
import { CodeEditorComponent } from './codexa/code-editor/code-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    CreateStudentComponent,
    LandingPageComponent,
    HeaderComponent,
    NavbarComponent,
    SectionComponent,
    LoginFormComponent,
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
    UploadCareerComponent,
    AdminPanelComponent,
    SyntaxshareComponent,
    HomeComponent,
    CodexaaiComponent,
    QuestionsComponent,
    CodeEditorComponent
  ],
  imports: [
    MonacoEditorModule.forRoot({
      baseUrl: 'assets/monaco-editor'
    }),
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
    CommonModule,
    UploadBlogComponent,
    UploadNotesComponent,
    CareersComponent,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }