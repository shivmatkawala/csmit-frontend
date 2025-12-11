import { Component, OnInit, inject } from '@angular/core';
import { CareerService, Job } from '../services/careers.service';

@Component({
  selector: 'app-careers',
  templateUrl: './careers.component.html',
  styleUrls: ['./careers.component.css']
})
export class CareersComponent implements OnInit {
  private careerService = inject(CareerService);
  
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  selectedDepartment: string = 'All';

  // Dynamic departments list based on available jobs + defaults
  departments: string[] = ['All', 'Training', 'Administration', 'Marketing', 'Development'];

  ngOnInit() {
    // 1. Trigger the fetch from backend
    this.careerService.loadJobs();

    // 2. Subscribe to the real-time stream
    this.careerService.jobs$.subscribe(data => {
      this.jobs = data;
      
      // Optional: Update filter buttons dynamically based on actual data
      const availableDepts = new Set(this.jobs.map(j => j.department));
      // Keep 'All' and merge with available departments
      this.departments = ['All', ...Array.from(availableDepts)];

      this.filterJobs();
    });
  }

  filterJobs() {
    if (this.selectedDepartment === 'All') {
      this.filteredJobs = this.jobs;
    } else {
      this.filteredJobs = this.jobs.filter(job => job.department === this.selectedDepartment);
    }
  }

  setDepartment(dept: string) {
    this.selectedDepartment = dept;
    this.filterJobs();
  }

  scrollToJobs() {
    document.getElementById('openings')?.scrollIntoView({ behavior: 'smooth' });
  }
}