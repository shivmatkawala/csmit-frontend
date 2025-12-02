import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  // UI State
  selectedFeature: 'batch' | 'notes' | 'success' = 'batch';
  
  // Data State
  featuredBatchIndex = 0;
  featuredBatch: any;
  selectedSyllabus: string = 'Full Stack Development';
  
  // Timers
  private batchInterval: any;

  // --- 1. UPCOMING BATCHES DATA ---
  upcomingBatches = [
    {
      courseName: 'Full Stack Java Masterclass',
      startDate: '15th Nov 2025',
      time: '7:00 PM - 9:00 PM',
      mode: 'Live Online',
      description: 'Learn Angular, Spring Boot, and Cloud deployment from scratch with live projects.',
      tags: ['Job Guarantee', 'Live Project'],
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
    },
    {
      courseName: 'Data Science with Python',
      startDate: '1st Dec 2025',
      time: '8:30 PM - 10:30 PM',
      mode: 'Hybrid',
      description: 'Master AI/ML concepts, Pandas, NumPy and deploy models on AWS.',
      tags: ['Placement Assist', 'Python'],
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
    }
  ];

  // --- 2. NOTES & RESOURCES DATA (Redesigned Structure) ---
  notesContentMap: any = {
    'Full Stack Development': {
      stats: [
        { value: '25+', label: 'Modules', icon: '📦' },
        { value: '100+', label: 'PDF Notes', icon: '📄' },
        { value: '50+', label: 'Assignments', icon: '📝' }
      ],
      resources: [
        { title: 'Java Oops Cheat Sheet', type: 'PDF', size: '2.5 MB', icon: '☕' },
        { title: 'Angular Lifecycle Hooks', type: 'Guide', size: '1.2 MB', icon: '🅰️' },
        { title: 'Spring Boot Microservices', type: 'E-Book', size: '5.8 MB', icon: '🍃' },
        { title: 'SQL Interview Questions', type: 'PDF', size: '3.1 MB', icon: '💾' }
      ]
    },
    'Data Science': {
      stats: [
        { value: '15+', label: 'Algorithms', icon: '🧮' },
        { value: '40+', label: 'Datasets', icon: '📊' },
        { value: '30+', label: 'Notebooks', icon: '📓' }
      ],
      resources: [
        { title: 'Python Pandas Guide', type: 'PDF', size: '4.2 MB', icon: '🐼' },
        { title: 'Machine Learning roadmap', type: 'Image', size: '1.5 MB', icon: '🤖' },
        { title: 'Statistics for DS', type: 'E-Book', size: '8.1 MB', icon: '📈' },
        { title: 'Tableau Visualization', type: 'Video', size: 'Link', icon: '📉' }
      ]
    }
  };
  syllabusOptions = Object.keys(this.notesContentMap);

  // --- 3. SUCCESS STORIES DATA ---
  successStories = [
    { 
      name: 'Rohan Sharma', 
      role: 'SDE-1', 
      company: 'Google', 
      package: '24 LPA',
      quote: "CSMIT transformed my career. The mentors were exceptional.",
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png'
    },
    { 
      name: 'Priya Verma', 
      role: 'Frontend Dev', 
      company: 'Microsoft', 
      package: '18 LPA',
      quote: "The live projects gave me the confidence to crack the interview.",
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/2048px-Microsoft_logo.svg.png'
    },
    { 
      name: 'Amit Kumar', 
      role: 'Data Analyst', 
      company: 'Amazon', 
      package: '15 LPA',
      quote: "From non-tech background to Amazon, thanks to the structured path.",
      image: 'https://randomuser.me/api/portraits/men/86.jpg',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png'
    },
    { 
      name: 'Sneha Reddy', 
      role: 'UX Designer', 
      company: 'Adobe', 
      package: '12 LPA',
      quote: "Best place to learn design thinking and implementation.",
      image: 'https://randomuser.me/api/portraits/women/65.jpg',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Adobe_logo_2020.svg/512px-Adobe_logo_2020.svg.png'
    }
  ];

  constructor() {}

  ngOnInit() {
    this.featuredBatch = this.upcomingBatches[0];
    this.startBatchRotation();
  }

  ngOnDestroy() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }

  // --- Methods ---

  selectFeature(feature: 'batch' | 'notes' | 'success') {
    this.selectedFeature = feature;
  }

  onSyllabusChange(val: string) {
    this.selectedSyllabus = val;
  }

  get currentNotesData() {
    return this.notesContentMap[this.selectedSyllabus];
  }

  startBatchRotation() {
    this.batchInterval = setInterval(() => {
      this.featuredBatchIndex = (this.featuredBatchIndex + 1) % this.upcomingBatches.length;
      this.featuredBatch = this.upcomingBatches[this.featuredBatchIndex];
    }, 6000); // 6 seconds rotation
  }
}