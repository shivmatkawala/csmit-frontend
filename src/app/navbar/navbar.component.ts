import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  // State to store the selected story for the modal
  selectedStory: any = null;

  // New state for dynamic content. 'batch' is default for rotation.
  selectedFeature: 'batch' | 'notes' | 'success' = 'batch'; 

  // Batch Rotation State
  featuredBatchIndex = 0;
  featuredBatch: any;
  batchInterval: any;

  // Success Story Rotation State
  visibleStories: any[] = []; // Only the 4 currently visible stories
  storyStartIndex = 0;
  storyInterval: any;
  readonly STORIES_PER_PAGE = 4; // Number of stories to show at once

  // Notes State
  selectedSyllabus: string = 'Full Stack Development';

  // --- Hardcoded Data ---

  // Upcoming batches data
  upcomingBatches = [
    {
      courseName: 'Full Stack Java Development',
      startDate: 'November 15, 2025',
      description: 'Master frontend and backend technologies with our comprehensive Java course.',
      imageUrl: 'https://images.unsplash.com/photo-1522252234503-e356532cafd5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    },
    {
      courseName: 'Data Science & Machine Learning',
      startDate: 'December 01, 2025',
      description: 'Unlock the power of data with Python, TensorFlow, and advanced ML models.',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    },
    {
      courseName: 'Cloud Computing & DevOps',
      startDate: 'December 10, 2025',
      description: 'Learn AWS, Azure, and CI/CD pipelines to become a certified cloud professional.',
      imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Notes data structure updated for dynamic content based on course selection
  notesContentMap: any = {
    'Full Stack Development': {
      title: 'Full Stack Notes: Frontend & Backend',
      metric1: { value: '210', label: 'Topics Covered' },
      metric2: { value: '80', label: 'Projects & Labs' },
      metric3: { value: '150', label: 'Downloadable PDFs' },
      topics: [
        { name: 'HTML5 & CSS3', icon: '🎨' },
        { name: 'JavaScript ES6+', icon: '💻' },
        { name: 'React/Angular', icon: '⚛️' },
        { name: 'Node.js & Express', icon: '⚙️' },
        { name: 'MongoDB/SQL', icon: '🗄️' },
        { name: 'APIs & REST', icon: '🔗' },
        { name: 'Authentication', icon: '🔒' },
        { name: 'Deployment', icon: '🚀' },
      ]
    },
    'Data Science': {
      title: 'Data Science & ML Notes: Analytics & AI',
      metric1: { value: '180', label: 'Modules' },
      metric2: { value: '55', label: 'Jupyter Notebooks' },
      metric3: { value: '120', label: 'Theory Handouts' },
      topics: [
        { name: 'Python & Pandas', icon: '🐍' },
        { name: 'Statistics', icon: '📊' },
        { name: 'Machine Learning', icon: '🤖' },
        { name: 'Deep Learning', icon: '🧠' },
        { name: 'Data Visualization', icon: '📈' },
      ]
    },
    'Cloud & DevOps': {
      title: 'Cloud & DevOps Notes: AWS & CI/CD',
      metric1: { value: '150', label: 'Lab Sessions' },
      metric2: { value: '40', label: 'Certification Guides' },
      metric3: { value: '100', label: 'Deployment Checklists' },
      topics: [
        { name: 'AWS Services', icon: '☁️' },
        { name: 'Docker & K8s', icon: '🐳' },
        { name: 'CI/CD Pipelines', icon: '🔄' },
        { name: 'Infrastructure as Code', icon: '📜' },
        { name: 'Monitoring', icon: '👀' },
      ]
    },
    'Cyber Security': {
      title: 'Cyber Security Notes: Ethical Hacking',
      metric1: { value: '120', label: 'Vulnerability Topics' },
      metric2: { value: '30', label: 'Tool Guides' },
      metric3: { value: '90', label: 'Case Studies' },
      topics: [
        { name: 'Network Security', icon: '🛡️' },
        { name: 'Penetration Testing', icon: '🔓' },
        { name: 'Cryptography', icon: '🔑' },
        { name: 'Malware Analysis', icon: '🦠' },
        { name: 'Digital Forensics', icon: '🔎' },
      ]
    }
  };
  
  // List of all syllabus options
  syllabusOptions: string[] = Object.keys(this.notesContentMap);


  // Success Stories (Added more data and logic for rotation)
  allSuccessStories = [
    // Group 1 (Initially visible)
    {
      id: 1,
      name: 'Rohan Sharma',
      company: 'Google',
      image: 'https://placehold.co/100x100/6d28d9/ffffff?text=RS',
      logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/google.svg',
      title: 'From a Small Town to Google\'s HQ',
      fullStory: 'Rohan started his journey with a dream bigger than his small town could contain. He joined our intensive full-stack development bootcamp, where he dove deep into modern technologies like React, Node.js, and cloud deployment. His story is a powerful testament to the idea that with the right guidance and unwavering determination, no goal is too distant.'
    },
    {
      id: 2,
      name: 'Priya Verma',
      company: 'Microsoft',
      image: 'https://placehold.co/100x100/f97316/ffffff?text=PV',
      logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/microsoft.svg',
      title: 'Cracking the Code to Microsoft',
      fullStory: 'Priya was always fascinated by the stories data could tell. As a star student in our data science program, she distinguished herself with her keen analytical mind and passion for machine learning. Now, as a Data Scientist at Microsoft, Priya is at the forefront of AI innovation, developing intelligent solutions that shape the future of technology.'
    },
     {
      id: 3,
      name: 'Amit Singh',
      company: 'Amazon',
      image: 'https://placehold.co/100x100/9333ea/ffffff?text=AS',
      logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/amazon.svg',
      title: 'Delivering Success at Amazon',
      fullStory: 'Amit specialized in the backbone of modern tech: DevOps and Cloud Computing. He gained hands-on experience with AWS, Docker, Kubernetes, and CI/CD pipelines. As a Cloud Engineer on the AWS team, he now helps maintain the massive, world-spanning infrastructure that powers countless businesses, ensuring reliability and performance at an incredible scale.'
    },
    {
      id: 4,
      name: 'Neha Gupta',
      company: 'Infosys',
      image: 'https://placehold.co/100x100/10b981/ffffff?text=NG',
      logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/infosys.svg',
      title: 'Rising Star at Infosys',
      fullStory: 'Neha completed our MERN Stack course and quickly found her footing in the fast-paced development world. Her commitment to clean code and efficient problem-solving made her a standout candidate. She chose Infosys, where she is now excelling as a Senior Software Developer, responsible for building scalable enterprise applications.'
    },
    // Group 2 (Rotates after 6 seconds)
    {
        id: 5,
        name: 'Vivek Kumar',
        company: 'Adobe',
        image: 'https://placehold.co/100x100/007bff/ffffff?text=VK',
        logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/adobe.svg',
        title: 'Designing the Future at Adobe',
        fullStory: 'Vivek joined our UI/UX design and frontend development track. He combined his passion for aesthetics with robust coding skills. His project portfolio, featuring stunning, highly performant web applications, caught the eye of Adobe recruiters. He now works on their flagship creative cloud products.'
    },
    {
        id: 6,
        name: 'Aisha Khan',
        company: 'Jio',
        image: 'https://placehold.co/100x100/ff4500/ffffff?text=AK',
        logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/relianceindustrieslimited.svg',
        title: 'Building India\'s Digital Spine',
        fullStory: 'Aisha excelled in our network engineering and security program. Her expertise in robust, scalable infrastructure made her a perfect fit for Reliance Jio. She is helping manage and secure the massive network that connects millions of users across the country.'
    },
    {
        id: 7,
        name: 'Siddharth Reddy',
        company: 'TCS',
        image: 'https://placehold.co/100x100/228b22/ffffff?text=SR',
        logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/tata.svg',
        title: 'Global Consulting Role at TCS',
        fullStory: 'Siddharth, a dedicated learner in our enterprise application development course, proved his mastery in SAP and Oracle platforms. This specialized knowledge led him to a high-value consulting position at Tata Consultancy Services (TCS), where he guides global clients through major digital transformations.'
    },
    {
        id: 8,
        name: 'Deepika Rao',
        company: 'Paytm',
        image: 'https://placehold.co/100x100/800080/ffffff?text=DR',
        logo: 'https://cdn.jsdelivr.co/npm/simple-icons@v3/icons/paytm.svg',
        title: 'FinTech Innovation at Paytm',
        fullStory: 'Deepika focused on high-performance backend systems and FinTech security. Her capstone project on secure payment gateway integration impressed Paytm. She is now an integral part of their engineering team, ensuring their massive volume of financial transactions are fast and secure.'
    }
  ];

  // --- Methods ---

  // Getter for dynamic notes data (automatically updates when syllabus changes)
  get currentNotesData() {
    return this.notesContentMap[this.selectedSyllabus] || this.notesContentMap[this.syllabusOptions[0]];
  }

  ngOnInit() {
    this.featuredBatch = this.upcomingBatches[this.featuredBatchIndex];
    this.startBatchRotation();
    this.updateVisibleStories(); // Initialize visible stories to the first 4
    // Story rotation is started only when success feature is selected
  }

  ngOnDestroy() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    if (this.storyInterval) {
        clearInterval(this.storyInterval);
    }
  }

  startBatchRotation() {
    if (this.batchInterval) clearInterval(this.batchInterval);
    this.batchInterval = setInterval(() => {
      this.featuredBatchIndex = (this.featuredBatchIndex + 1) % this.upcomingBatches.length;
      this.featuredBatch = this.upcomingBatches[this.featuredBatchIndex];
    }, 5000); // 5 seconds rotation
  }
  
  startStoryRotation() {
    if (this.storyInterval) clearInterval(this.storyInterval);
    this.storyInterval = setInterval(() => {
        // Rotation logic: incrementing index by 4 stories
        this.storyStartIndex = (this.storyStartIndex + this.STORIES_PER_PAGE) % this.allSuccessStories.length;
        this.updateVisibleStories();
    }, 6000); // 6 seconds rotation
  }

  stopStoryRotation() {
      if (this.storyInterval) {
          clearInterval(this.storyInterval);
          this.storyInterval = null;
      }
  }

  // Update the 4 visible stories for story rotation
  updateVisibleStories() {
    const end = this.storyStartIndex + this.STORIES_PER_PAGE;
    // Wrap-around logic to handle rotation
    if (end > this.allSuccessStories.length) {
        this.visibleStories = [
            ...this.allSuccessStories.slice(this.storyStartIndex),
            ...this.allSuccessStories.slice(0, end - this.allSuccessStories.length)
        ];
    } else {
        this.visibleStories = this.allSuccessStories.slice(this.storyStartIndex, end);
    }
  }

  selectFeature(feature: 'batch' | 'notes' | 'success') {
    // Stop all intervals first
    if (this.batchInterval) clearInterval(this.batchInterval);
    this.batchInterval = null;
    this.stopStoryRotation();

    // Start/Restart relevant intervals
    if (feature === 'batch') {
        this.startBatchRotation();
    } else if (feature === 'success') {
        this.storyStartIndex = 0; // Always start from the first group when Success Stories is selected
        this.updateVisibleStories();
        this.startStoryRotation();
    }

    // Close the story modal when changing main features
    this.selectedStory = null;
    document.body.classList.remove('body-no-scroll');

    this.selectedFeature = feature;
  }

  // Method to open the story detail modal (Rotation will pause)
  viewStory(story: any) {
    this.stopStoryRotation(); // Stop rotation when the modal opens
    this.selectedStory = story;
    document.body.classList.add('body-no-scroll');
  }

  // Method to close the story detail modal (Rotation will resume)
  closeStoryModal() {
    this.selectedStory = null;
    document.body.classList.remove('body-no-scroll');
    // Restart rotation when modal is closed, only if 'success' feature is active
    if (this.selectedFeature === 'success') {
        this.startStoryRotation();
    }
  }

  // Method to handle syllabus selection change (value is passed directly from ngModelChange)
  onSyllabusChange(selectedSyllabus: string) {
    this.selectedSyllabus = selectedSyllabus;
    console.log('Selected syllabus for notes:', this.selectedSyllabus);
    // Data is automatically updated via currentNotesData getter
  }
}
