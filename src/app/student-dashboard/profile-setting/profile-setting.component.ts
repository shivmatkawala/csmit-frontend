import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { StudentProfileData } from '../student-dashboard.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile-setting',
  templateUrl: './profile-setting.component.html',
  styleUrls: ['./profile-setting.component.css']
})
export class ProfileSettingComponent implements OnInit {
  // Dashboard component se profile data recieve karega
  @Input() profileData: StudentProfileData | undefined;

  // Wapas Dashboard par jane ke liye event trigger karega
  @Output() goBack = new EventEmitter<void>();

  // Profile picture ko edit karne ke liye dummy URL
  newProfileImage: string | ArrayBuffer | null = null; 
  
  // Dummy message status
  message: { text: string, type: 'success' | 'error' | 'warning' } | null = null;

  // Form Group for editable fields
  profileForm = new FormGroup({
    fullName: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    language: new FormControl('English'),
    notifications: new FormControl('Receive All')
  });

  // Security Form Group
  securityForm = new FormGroup({
    currentPassword: new FormControl('', Validators.required),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', Validators.required),
    twoFactorEnabled: new FormControl(false)
  });

  ngOnInit(): void {
    // Input data se form ko initialize karna
    if (this.profileData) {
      this.profileForm.patchValue({
        fullName: this.profileData.full_name,
        email: this.profileData.email,
        language: 'English', // Default value
        notifications: 'Receive All' // Default value
      });
      // Dummy 2FA status initialize
      this.securityForm.controls.twoFactorEnabled.setValue(true);
    }
  }

  // File change event ko handle karna
  onFileChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        this.showMessage('Image size must be less than 2MB.', 'error');
        element.value = ''; // Clear file input
        this.newProfileImage = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.newProfileImage = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Wapas jane ka function
  navigateToDashboard(): void {
    this.goBack.emit();
  }
  
  // Save profile changes
  saveProfileChanges(): void {
    if (this.profileForm.valid) {
      console.log('Profile changes saved!', this.profileForm.value);
      this.showMessage('Profile settings updated successfully!', 'success');
      // Dummy: In real app, API call ke baad isko update karna
      if (this.profileData) {
        this.profileData.full_name = this.profileForm.value.fullName || this.profileData.full_name;
        this.profileData.email = this.profileForm.value.email || this.profileData.email;
      }
      setTimeout(() => this.navigateToDashboard(), 2000);
    } else {
      this.showMessage('Please fix the errors in General Settings form.', 'error');
    }
  }
  
  // Save security changes (Dummy)
  saveSecurityChanges(): void {
    const { currentPassword, newPassword, confirmPassword, twoFactorEnabled } = this.securityForm.value;

    if (newPassword && currentPassword && newPassword !== confirmPassword) {
      this.showMessage('New Password and Confirm Password do not match.', 'error');
      return;
    }
    
    // Yahan real API call hoga
    console.log('Security changes saved!', this.securityForm.value);
    
    let message = 'Security settings updated.';
    if (newPassword) {
      message += ' Password changed.';
    }
    if (twoFactorEnabled !== undefined) {
      message += twoFactorEnabled ? ' 2FA enabled.' : ' 2FA disabled.';
    }

    this.showMessage(message, 'success');
    this.securityForm.reset({ twoFactorEnabled: twoFactorEnabled }); // Reset password fields only
  }

  // Message show karne ka function
  showMessage(text: string, type: 'success' | 'error' | 'warning'): void {
    this.message = { text, type };
    setTimeout(() => {
      this.message = null;
    }, 5000);
  }

  // Utility to determine course icon
  getCourseIcon(category: string): string {
    switch (category) {
      case 'CS':
        return 'fas fa-terminal';
      case 'IT':
        return 'fas fa-server';
      default:
        return 'fas fa-graduation-cap';
    }
  }
}
