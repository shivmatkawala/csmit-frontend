import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription, forkJoin } from 'rxjs';
import { Doubt, DoubtService, Solution } from '../services/doubt.service';
import { ApiService } from '../services/api.service';
import { CreateCourseService } from '../services/create-course.service'; 

@Component({
  selector: 'app-syntaxshare',
  templateUrl: './syntaxshare.component.html',
  styleUrls: ['./syntaxshare.component.css']
})
export class SyntaxshareComponent implements OnInit, OnDestroy {
  doubts: Doubt[] = [];
  loading: boolean = true;
  refreshing: boolean = false; 
  currentUserId: string = '';
  currentUserName: string = ''; 
  
  private updateSubscription!: Subscription;

  // Form Models
  newDoubtText: string = '';
  selectedSubjectId: number | null = null;
  
  // Dynamic Subjects List
  subjects: { id: number, name: string }[] = [];

  constructor(
    private doubtService: DoubtService,
    private apiService: ApiService,
    private createCourseService: CreateCourseService // Inject Course Service
  ) {}

  ngOnInit(): void {
    // Get User Data from Session
    const userInfo = this.apiService.getStoredStudentData();
    
    // --- UPDATED LOGIC: Fetch Name from Dashboard Storage (STUDENT_DATA) ---
    // Dashboard logic use kar rahe hain taaki Gmail ki jagah Name dikhe
    let dashboardName = '';
    try {
        const storedStudentData = localStorage.getItem('STUDENT_DATA') || sessionStorage.getItem('STUDENT_DATA');
        if (storedStudentData) {
            const parsedData = JSON.parse(storedStudentData);
            if (parsedData.info && parsedData.info.full_name) {
                dashboardName = parsedData.info.full_name;
            }
        }
    } catch(e) {
        console.error('Error reading student dashboard data', e);
    }

    if (userInfo && userInfo.userId) {
        this.currentUserId = userInfo.userId;
        
        // Priority: Dashboard Name > API Full Name > Username (Email)
        // Agar dashboardName available hai (Profile setup done), toh woh use karega.
        this.currentUserName = dashboardName || userInfo.info?.full_name || userInfo.username;
        
        // Agar abhi bhi email dikh raha hai aur '@' hai, toh usse format kar dete hain
        if (this.currentUserName.includes('@')) {
            this.currentUserName = this.currentUserName.split('@')[0]; // Fallback to part before @
        }
    }

    // Load Subjects First
    this.loadSubjects();

    // Initial Load
    this.loadData(true);

    // Polling every 5 seconds
    this.updateSubscription = interval(5000).subscribe(() => {
      this.loadData(false);
    });
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  // New: TrackBy function to prevent HTML re-rendering and losing focus
  trackByDoubt(index: number, doubt: Doubt): number {
    return doubt.doubtid;
  }

  // Fetch Active Subjects from Courses
  loadSubjects() {
    this.createCourseService.listCourses().subscribe({
      next: (courses) => {
        const extractedSubjects: { id: number, name: string }[] = [];
        
        // Iterate through courses to find subjects
        courses.forEach(course => {
            if (course.subjects && course.subjects.length > 0) {
                course.subjects.forEach(sub => {
                    if (sub.subjectid) {
                         extractedSubjects.push({ id: sub.subjectid, name: sub.subjectname });
                    }
                });
            } else {
                // Fallback: If course has no subjects, treat the Course itself as a Subject (Topic)
                extractedSubjects.push({ id: course.courseId, name: course.courseName });
            }
        });

        // Remove Duplicates based on ID
        this.subjects = extractedSubjects.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

        // Select first subject by default if available
        if (this.subjects.length > 0) {
            this.selectedSubjectId = this.subjects[0].id;
        }
      },
      error: (err) => console.error('Error fetching subjects:', err)
    });
  }

  loadData(isInitial: boolean) {
    if (isInitial) this.loading = true;
    else this.refreshing = true;

    forkJoin({
      doubts: this.doubtService.getAllDoubts(),
      solutions: this.doubtService.getAllSolutions()
    }).subscribe({
      next: ({ doubts, solutions }) => {
        this.mapDoubtsAndSolutions(doubts, solutions);
        this.loading = false;
        this.refreshing = false;
      },
      error: (err) => {
        console.error('Error fetching data:', err);
        this.loading = false;
        this.refreshing = false;
      }
    });
  }

  mapDoubtsAndSolutions(doubts: Doubt[], solutions: Solution[]) {
    // Preserve UI state (reply box open OR typed text)
    const oldStateMap = new Map<number, { showReply: boolean, tempReply: string }>();
    this.doubts.forEach(d => {
      // Save both the toggle state AND the text user was typing
      oldStateMap.set(d.doubtid, { 
        showReply: d.showReply || false, 
        tempReply: d.tempReply || '' 
      });
    });

    const processedDoubts = doubts.map(doubt => {
      const mySolutions = solutions.filter(sol => {
        const solDoubtId = (typeof sol.doubtid === 'object' && sol.doubtid !== null) 
                           ? (sol.doubtid as any).doubtid 
                           : sol.doubtid;
        return solDoubtId === doubt.doubtid;
      });

      mySolutions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Restore state from map
      const savedState = oldStateMap.get(doubt.doubtid);

      return {
        ...doubt,
        solutions: mySolutions,
        showReply: savedState ? savedState.showReply : false,
        tempReply: savedState ? savedState.tempReply : '' // Restore typed text
      };
    });
    
    processedDoubts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    this.doubts = processedDoubts;
  }

  postDoubt() {
    if (!this.newDoubtText.trim()) return;
    if (!this.currentUserId) {
      alert('Please login to post a doubt.');
      return;
    }
    if (!this.selectedSubjectId) {
        alert('Please select a subject/topic.');
        return;
    }

    const payload = {
      subjectid: Number(this.selectedSubjectId),
      userid: this.currentUserId,
      doubttext: this.newDoubtText
    };

    this.doubtService.createDoubt(payload).subscribe({
      next: (res) => {
        this.newDoubtText = '';
        this.loadData(false); 
      },
      error: (err) => {
        console.error('Failed to post doubt:', err);
        alert('Failed to post doubt.');
      }
    });
  }

  postSolution(doubt: Doubt) {
    // Now using the model bound variable doubt.tempReply
    const solutionText = doubt.tempReply;

    if (!solutionText || !solutionText.trim()) return;
    if (!this.currentUserId) {
      alert('Please login to reply.');
      return;
    }

    const payload = {
      doubtid: doubt.doubtid,
      userid: this.currentUserId,
      solution: solutionText
    };

    this.doubtService.createSolution(payload).subscribe({
      next: (res) => {
        doubt.tempReply = ''; // Clear the specific text box
        this.loadData(false);
      },
      error: (err) => {
        console.error('Failed to post solution:', err);
        alert('Failed to reply.');
      }
    });
  }

  toggleReply(doubt: Doubt) {
    doubt.showReply = !doubt.showReply;
  }

  getInitials(name: string | undefined | null): string {
      if (!name) return '?';
      return name.charAt(0).toUpperCase();
  }
}