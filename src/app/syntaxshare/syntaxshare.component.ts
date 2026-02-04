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
    private createCourseService: CreateCourseService 
  ) {}

  ngOnInit(): void {
    const userInfo = this.apiService.getStoredStudentData();
    
    // Fetch Name from Dashboard Storage for consistent branding
    let dashboardName = '';
    try {
        const storedStudentData = localStorage.getItem('STUDENT_DATA') || sessionStorage.getItem('STUDENT_DATA');
        if (storedStudentData) {
            const parsedData = JSON.parse(storedStudentData);
            if (parsedData.info && parsedData.info.full_name) {
                dashboardName = parsedData.info.full_name;
            }
        }
    } catch(e) {}

    if (userInfo && userInfo.userId) {
        this.currentUserId = userInfo.userId;
        this.currentUserName = dashboardName || userInfo.info?.full_name || userInfo.username;
        
        if (this.currentUserName.includes('@')) {
            this.currentUserName = this.currentUserName.split('@')[0];
        }
    }

    this.loadSubjects();
    this.loadData(true);

    // Polling interval for live updates
    this.updateSubscription = interval(10000).subscribe(() => {
      this.loadData(false);
    });
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  trackByDoubt(index: number, doubt: Doubt): number {
    return doubt.doubtid;
  }

  loadSubjects() {
    this.createCourseService.listCourses().subscribe({
      next: (courses) => {
        const extractedSubjects: { id: number, name: string }[] = [];
        courses.forEach(course => {
            if (course.subjects && course.subjects.length > 0) {
                course.subjects.forEach(sub => {
                    if (sub.subjectid) {
                         extractedSubjects.push({ id: sub.subjectid, name: sub.subjectname });
                    }
                });
            } else {
                extractedSubjects.push({ id: course.courseId, name: course.courseName });
            }
        });
        this.subjects = extractedSubjects.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        if (this.subjects.length > 0) {
            this.selectedSubjectId = this.subjects[0].id;
        }
      }
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
      error: () => {
        this.loading = false;
        this.refreshing = false;
      }
    });
  }

  mapDoubtsAndSolutions(doubts: Doubt[], solutions: Solution[]) {
    const oldStateMap = new Map<number, { showReply: boolean, tempReply: string }>();
    this.doubts.forEach(d => {
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
      const savedState = oldStateMap.get(doubt.doubtid);

      return {
        ...doubt,
        solutions: mySolutions,
        showReply: savedState ? savedState.showReply : false,
        tempReply: savedState ? savedState.tempReply : '' 
      };
    });
    
    processedDoubts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    this.doubts = processedDoubts;
  }

  postDoubt() {
    if (!this.newDoubtText.trim() || !this.currentUserId || !this.selectedSubjectId) return;

    const payload = {
      subjectid: Number(this.selectedSubjectId),
      userid: this.currentUserId,
      doubttext: this.newDoubtText
    };

    this.doubtService.createDoubt(payload).subscribe({
      next: () => {
        this.newDoubtText = '';
        this.loadData(false); 
      }
    });
  }

  postSolution(doubt: Doubt) {
    const solutionText = doubt.tempReply;
    if (!solutionText || !solutionText.trim() || !this.currentUserId) return;

    const payload = {
      doubtid: doubt.doubtid,
      userid: this.currentUserId,
      solution: solutionText
    };

    this.doubtService.createSolution(payload).subscribe({
      next: () => {
        doubt.tempReply = ''; 
        doubt.showReply = false;
        this.loadData(false);
      }
    });
  }

  toggleReply(doubt: Doubt) {
    doubt.showReply = !doubt.showReply;
  }

  getInitials(name: string | undefined | null): string {
      if (!name) return 'U';
      return name.charAt(0).toUpperCase();
  }
}