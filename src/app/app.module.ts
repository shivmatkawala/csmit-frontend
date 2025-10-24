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
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
import { UploadJobComponent } from './upload-job/upload-job.component';
import { CreateBatchComponent } from './create-batch/create-batch.component';
import { CreateExamComponent } from './create-exam/create-exam.component';
import { BlankFormComponent } from './create-exam/blank-form/blank-form.component';
import { ContactInfoComponent } from './create-exam/contact-info/contact-info.component';
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
    TrainerDashboardComponent,
    UploadJobComponent,
    CreateBatchComponent,
    CreateExamComponent,
    BlankFormComponent,
    ContactInfoComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    FormsModule,
    
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
