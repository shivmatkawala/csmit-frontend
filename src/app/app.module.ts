import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CreateStudentComponent } from './create-student/create-student.component';
import { GenerateAtsResumeComponent } from './generate-ats-resume/generate-ats-resume.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { HeaderComponent } from './header/header.component';
import { NavbarComponent } from './navbar/navbar.component';
import { SectionComponent } from './section/section.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { AdminPanelComponent } from './admin-panel/admin-panel.component';
import { FooterComponent } from './footer/footer.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { AdminFormComponent } from './admin-panel/admin-form/admin-form.component';
import { ProfileSettingComponent } from './student-dashboard/profile-setting/profile-setting.component';
import { CreateCourseComponent } from './create-course/create-course.component'; // Keep the import
import { AboutCsmitComponent } from './about-csmit/about-csmit.component';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
import { CreateUserComponent } from './create-user/create-user.component';
import { AssignUserToBatchComponent } from './assign-user-to-batch/assign-user-to-batch.component';
import { CreateJobComponent } from './create-job/create-job.component';
import { CreateExamComponent } from './createexam/createexam.component';
import { CreateBatchComponent } from './create-batch/create-batch.component';
@NgModule({
  declarations: [
    AppComponent,
    CreateStudentComponent,
    GenerateAtsResumeComponent,
    LandingPageComponent,
    HeaderComponent,
    NavbarComponent,
    SectionComponent,
    LoginFormComponent,
    AdminPanelComponent,
    FooterComponent,
    ChatbotComponent,
    StudentDashboardComponent,
    ProfileSettingComponent,
    CreateCourseComponent,
    AboutCsmitComponent,
    TrainerDashboardComponent,
    CreateUserComponent,
    AssignUserToBatchComponent,
    CreateJobComponent,
    CreateExamComponent,
    CreateBatchComponent
    // REMOVED TrainerDashboardComponent from declarations as it is standalone
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
    AdminFormComponent,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
