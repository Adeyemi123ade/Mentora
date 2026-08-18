import tutorMichael from '../assets/tutors/tutor-michael.png';
import tutorRuth from '../assets/tutors/tutor-ruth.png';
import tutorDaniel from '../assets/tutors/tutor-daniel.png';
import tutorHauwa from '../assets/tutors/tutor-hauwa.png';
import tutorAmaka from '../assets/tutors/tutor-amaka.png';

export type CategoryKey = 'ai' | 'coding' | 'data' | 'speaking' | 'math' | 'business';

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  ai: 'AI & Machine Learning',
  coding: 'Coding & Programming',
  data: 'Data Science & Analytics',
  speaking: 'Public Speaking',
  math: 'Math & Sciences',
  business: 'Business & Entrepreneurship',
};

export type TutorType = 'professional' | 'university' | 'expert';
export type Availability = 'now' | 'weekdays' | 'weekends';
export type SessionType = 'online' | 'in-person';

export type Review = {
  name: string;
  verified: boolean;
  rating: number;
  date: string;
  text: string;
};

export type Faq = { question: string; answer: string };

export type Tutor = {
  id: string;
  name: string;
  photo?: string;
  title: string;
  category: CategoryKey;
  tags: string[];
  experienceYears: number;
  rating: number;
  reviews: number;
  education: string;
  availability: Availability;
  availabilityLabel: string;
  sessionTypes: SessionType[];
  price: number;
  status: 'Online' | 'Busy';
  type: TutorType;
  verified: boolean;
  location: string;
  bio: string;
  languages: { name: string; level: string }[];
  educationDetail: string;
  expertise: string[];
  studentsTaught: number;
  experienceHistory: { role: string; org: string; period: string }[];
  outcomes: string[];
  ratingBreakdown: { stars: number; percent: number }[];
  reviewsList: Review[];
  avgResponseTime: string;
  faqs: Faq[];
};

const WEEKLY_SCHEDULE_FULL = [
  { day: 'Mon', hours: '9:00 AM – 9:00 PM' },
  { day: 'Tue', hours: '9:00 AM – 9:00 PM' },
  { day: 'Wed', hours: '9:00 AM – 9:00 PM' },
  { day: 'Thu', hours: '9:00 AM – 9:00 PM' },
  { day: 'Fri', hours: '9:00 AM – 9:00 PM' },
  { day: 'Sat', hours: '10:00 AM – 6:00 PM' },
  { day: 'Sun', hours: null as string | null },
];

const WEEKLY_SCHEDULE_BUSY = [
  { day: 'Mon', hours: '2:00 PM – 8:00 PM' },
  { day: 'Tue', hours: '2:00 PM – 8:00 PM' },
  { day: 'Wed', hours: null as string | null },
  { day: 'Thu', hours: '2:00 PM – 8:00 PM' },
  { day: 'Fri', hours: null as string | null },
  { day: 'Sat', hours: '10:00 AM – 4:00 PM' },
  { day: 'Sun', hours: null as string | null },
];

export const DEFAULT_FAQS: Faq[] = [
  { question: 'How are sessions conducted?', answer: 'Sessions run live over video call with screen sharing, so you can follow along and ask questions in real time.' },
  { question: 'What tools will we use?', answer: 'A video call link plus a shared workspace for notes, code or slides — no special software required beforehand.' },
  { question: 'Can I reschedule a session?', answer: 'Yes, sessions can be rescheduled up to 12 hours in advance from your bookings page at no extra cost.' },
  { question: 'Do you offer trial sessions?', answer: 'A shorter introductory session is available on request to make sure it is a good fit before booking a full package.' },
];

function ratingBreakdownFor(rating: number): { stars: number; percent: number }[] {
  if (rating >= 4.8) return [{ stars: 5, percent: 92 }, { stars: 4, percent: 6 }, { stars: 3, percent: 1 }, { stars: 2, percent: 1 }, { stars: 1, percent: 0 }];
  if (rating >= 4.6) return [{ stars: 5, percent: 78 }, { stars: 4, percent: 16 }, { stars: 3, percent: 4 }, { stars: 2, percent: 1 }, { stars: 1, percent: 1 }];
  return [{ stars: 5, percent: 62 }, { stars: 4, percent: 24 }, { stars: 3, percent: 9 }, { stars: 2, percent: 3 }, { stars: 1, percent: 2 }];
}

export const TUTORS: Tutor[] = [
  {
    id: 't1',
    name: 'Michael Okafor',
    photo: tutorMichael,
    title: 'AI & Machine Learning Expert',
    category: 'ai',
    tags: ['Python', 'Machine Learning', 'TensorFlow', 'Deep Learning', 'Data Analysis'],
    experienceYears: 5,
    rating: 4.9,
    reviews: 124,
    education: 'MSc Computer Science',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online'],
    price: 8000,
    status: 'Online',
    type: 'professional',
    verified: true,
    location: 'Lagos, Nigeria',
    bio: "I'm passionate about making complex AI and Machine Learning concepts simple and practical. I help students build real-world projects and gain the skills they need to excel in tech.",
    languages: [{ name: 'English', level: 'Native' }, { name: 'Yoruba', level: 'Conversational' }],
    educationDetail: 'MSc Computer Science, University of Lagos',
    expertise: ['AI Fundamentals', 'Machine Learning', 'Deep Learning', 'Data Science', 'Python Programming', 'Computer Vision', 'NLP', 'Data Analysis'],
    studentsTaught: 320,
    experienceHistory: [
      { role: 'Data Scientist', org: 'TechNova Solutions', period: '2021 – Present' },
      { role: 'AI Research Assistant', org: 'University of Lagos', period: '2019 – 2021' },
    ],
    outcomes: [
      'Build strong foundations in AI and Machine Learning',
      'Improve problem-solving and analytical thinking',
      'Work on real-world projects and case studies',
      'Become confident in Python and data science tools',
    ],
    ratingBreakdown: ratingBreakdownFor(4.9),
    reviewsList: [
      { name: 'Aisha B.', verified: true, rating: 5, date: '2 weeks ago', text: 'Michael explains complex topics so clearly. I built my first machine learning model after just a few sessions!' },
      { name: 'Tobi A.', verified: true, rating: 5, date: '1 month ago', text: 'Patient, knowledgeable and always prepared. Highly recommend for anyone starting out in AI.' },
    ],
    avgResponseTime: '1 hour',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't2',
    name: 'Ruth Adeyemi',
    photo: tutorRuth,
    title: 'Full Stack Developer & Mentor',
    category: 'coding',
    tags: ['JavaScript', 'React', 'Node.js'],
    experienceYears: 4,
    rating: 4.8,
    reviews: 96,
    education: 'BSc Software Engineering',
    availability: 'weekdays',
    availabilityLabel: 'Available Tomorrow',
    sessionTypes: ['online', 'in-person'],
    price: 7500,
    status: 'Online',
    type: 'professional',
    verified: true,
    location: 'Abuja, Nigeria',
    bio: "I help students go from zero to shipping real web apps. My sessions focus on building things, not just watching slides — you'll leave every session with working code.",
    languages: [{ name: 'English', level: 'Native' }, { name: 'Igbo', level: 'Conversational' }],
    educationDetail: 'BSc Software Engineering, Covenant University',
    expertise: ['Web Development', 'JavaScript', 'React', 'Node.js', 'REST APIs', 'Git & GitHub', 'Databases', 'Software Design'],
    studentsTaught: 210,
    experienceHistory: [
      { role: 'Full Stack Developer', org: 'PayFlow Africa', period: '2022 – Present' },
      { role: 'Frontend Engineer', org: 'Freelance', period: '2020 – 2022' },
    ],
    outcomes: [
      'Build and deploy full stack web applications',
      'Master JavaScript, React and Node.js fundamentals',
      'Learn to work confidently with Git and REST APIs',
      'Develop strong debugging and problem-solving habits',
    ],
    ratingBreakdown: ratingBreakdownFor(4.8),
    reviewsList: [
      { name: 'Chika N.', verified: true, rating: 5, date: '3 weeks ago', text: 'Ruth is an amazing mentor. She helped me ship my first full stack project.' },
      { name: 'David O.', verified: true, rating: 4, date: '2 months ago', text: 'Very practical sessions, always focused on real projects.' },
    ],
    avgResponseTime: '2 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't3',
    name: 'Daniel Yusuf',
    photo: tutorDaniel,
    title: 'Data Scientist',
    category: 'data',
    tags: ['Python', 'Data Analysis', 'SQL'],
    experienceYears: 6,
    rating: 4.9,
    reviews: 78,
    education: 'MSc Data Science',
    availability: 'weekends',
    availabilityLabel: 'Available from May 25',
    sessionTypes: ['online'],
    price: 9000,
    status: 'Busy',
    type: 'expert',
    verified: true,
    location: 'Kaduna, Nigeria',
    bio: 'I turn raw data into clear stories. My students learn to think like data scientists — asking the right questions before writing a single line of code.',
    languages: [{ name: 'English', level: 'Native' }, { name: 'Hausa', level: 'Native' }],
    educationDetail: 'MSc Data Science, Ahmadu Bello University',
    expertise: ['Data Analysis', 'SQL', 'Python', 'Statistics', 'Data Visualization', 'Machine Learning'],
    studentsTaught: 145,
    experienceHistory: [
      { role: 'Senior Data Scientist', org: 'InsightHub', period: '2020 – Present' },
      { role: 'Data Analyst', org: 'FinTrust Bank', period: '2017 – 2020' },
    ],
    outcomes: [
      'Analyse and visualise real datasets with confidence',
      'Write clean, efficient SQL and Python for data work',
      'Understand core statistics behind data decisions',
      'Build a portfolio of real data science projects',
    ],
    ratingBreakdown: ratingBreakdownFor(4.9),
    reviewsList: [
      { name: 'Grace E.', verified: true, rating: 5, date: '1 week ago', text: "Daniel's explanations of SQL finally made it click for me." },
      { name: 'Femi K.', verified: false, rating: 5, date: '1 month ago', text: 'Great depth of knowledge and very structured lessons.' },
    ],
    avgResponseTime: '3 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't4',
    name: 'Hauwa Ibrahim',
    photo: tutorHauwa,
    title: 'Public Speaking Coach',
    category: 'speaking',
    tags: ['Public Speaking', 'Leadership', 'Confidence'],
    experienceYears: 3,
    rating: 4.7,
    reviews: 63,
    education: 'BA Communication',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online', 'in-person'],
    price: 6000,
    status: 'Online',
    type: 'professional',
    verified: true,
    location: 'Abuja, Nigeria',
    bio: 'I coach students to speak with clarity and confidence, whether that is a classroom presentation, a debate, or their very first public talk.',
    languages: [{ name: 'English', level: 'Native' }, { name: 'Hausa', level: 'Native' }],
    educationDetail: 'BA Communication, University of Abuja',
    expertise: ['Public Speaking', 'Debate', 'Presentation Skills', 'Confidence Building', 'Storytelling', 'Body Language'],
    studentsTaught: 98,
    experienceHistory: [
      { role: 'Public Speaking Coach', org: 'Voice & Vision Academy', period: '2022 – Present' },
      { role: 'Debate Club Trainer', org: 'Abuja Youth Forum', period: '2020 – 2022' },
    ],
    outcomes: [
      'Speak confidently in front of any audience',
      'Structure a clear, persuasive presentation',
      'Manage nerves and think on your feet',
      'Use voice and body language with intention',
    ],
    ratingBreakdown: ratingBreakdownFor(4.7),
    reviewsList: [
      { name: 'Musa I.', verified: true, rating: 5, date: '4 days ago', text: 'My daughter went from avoiding class presentations to volunteering for them.' },
      { name: 'Blessing T.', verified: true, rating: 4, date: '3 weeks ago', text: 'Hauwa is warm, encouraging and really pushes you to improve.' },
    ],
    avgResponseTime: '1 hour',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't5',
    name: 'Amaka Nwosu',
    photo: tutorAmaka,
    title: 'Math Tutor',
    category: 'math',
    tags: ['Mathematics', 'Algebra', 'Calculus'],
    experienceYears: 5,
    rating: 4.8,
    reviews: 112,
    education: 'BSc Mathematics',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online'],
    price: 6500,
    status: 'Online',
    type: 'university',
    verified: true,
    location: 'Enugu, Nigeria',
    bio: 'Math clicks once you see the pattern behind it. I break problems down step by step so students build real understanding, not just memorised formulas.',
    languages: [{ name: 'English', level: 'Native' }, { name: 'Igbo', level: 'Native' }],
    educationDetail: 'BSc Mathematics, University of Nigeria, Nsukka',
    expertise: ['Algebra', 'Calculus', 'Geometry', 'Statistics', 'Trigonometry', 'Exam Preparation'],
    studentsTaught: 176,
    experienceHistory: [
      { role: 'Math Tutor', org: 'Freelance', period: '2021 – Present' },
      { role: 'Teaching Assistant', org: 'University of Nigeria, Nsukka', period: '2020 – 2021' },
    ],
    outcomes: [
      'Build a strong foundation in algebra and calculus',
      'Approach exam questions with a clear method',
      'Improve speed and accuracy on problem sets',
      'Gain confidence tackling harder math topics',
    ],
    ratingBreakdown: ratingBreakdownFor(4.8),
    reviewsList: [
      { name: 'Ifeoma C.', verified: true, rating: 5, date: '5 days ago', text: 'Amaka made calculus feel manageable for the first time.' },
      { name: 'Samuel P.', verified: true, rating: 5, date: '1 month ago', text: 'Great at explaining things multiple ways until it clicks.' },
    ],
    avgResponseTime: '2 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't6',
    name: 'Tunde Adebayo',
    title: 'Mobile App Developer',
    category: 'coding',
    tags: ['Flutter', 'Dart', 'Firebase'],
    experienceYears: 4,
    rating: 4.8,
    reviews: 89,
    education: 'BSc Computer Science',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online'],
    price: 7000,
    status: 'Online',
    type: 'professional',
    verified: true,
    location: 'Ibadan, Nigeria',
    bio: 'I teach students to design and ship real mobile apps from scratch, covering everything from UI design to publishing on the app store.',
    languages: [{ name: 'English', level: 'Native' }, { name: 'Yoruba', level: 'Native' }],
    educationDetail: 'BSc Computer Science, University of Ibadan',
    expertise: ['Flutter', 'Dart', 'Firebase', 'Mobile UI Design', 'App Deployment', 'REST APIs'],
    studentsTaught: 132,
    experienceHistory: [
      { role: 'Mobile App Developer', org: 'Zenith Apps', period: '2021 – Present' },
      { role: 'Junior Developer', org: 'CodeHive Studios', period: '2019 – 2021' },
    ],
    outcomes: [
      'Design and build a complete mobile app',
      'Understand state management and app architecture',
      'Connect apps to real backends and APIs',
      'Publish an app to the app store',
    ],
    ratingBreakdown: ratingBreakdownFor(4.8),
    reviewsList: [
      { name: 'Kelechi U.', verified: true, rating: 5, date: '6 days ago', text: 'Tunde helped me publish my first app in just a few weeks.' },
      { name: 'Zainab M.', verified: true, rating: 4, date: '2 months ago', text: 'Clear, patient, and always up to date with best practices.' },
    ],
    avgResponseTime: '2 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't7',
    name: 'Amara Chukwu',
    title: 'AI Research Assistant',
    category: 'ai',
    tags: ['Python', 'Deep Learning'],
    experienceYears: 2,
    rating: 4.6,
    reviews: 41,
    education: 'BSc Computer Science',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online'],
    price: 5500,
    status: 'Online',
    type: 'university',
    verified: false,
    location: 'Owerri, Nigeria',
    bio: "As a recent graduate immersed in AI research, I love helping beginners get past the intimidating parts of machine learning and start building.",
    languages: [{ name: 'English', level: 'Native' }],
    educationDetail: 'BSc Computer Science, Federal University of Technology, Owerri',
    expertise: ['Python Programming', 'Deep Learning', 'Neural Networks', 'AI Fundamentals'],
    studentsTaught: 54,
    experienceHistory: [
      { role: 'AI Research Assistant', org: 'FUTO AI Lab', period: '2023 – Present' },
    ],
    outcomes: [
      'Understand the fundamentals of neural networks',
      'Get comfortable writing Python for AI projects',
      'Build a first deep learning model from scratch',
    ],
    ratingBreakdown: ratingBreakdownFor(4.6),
    reviewsList: [
      { name: 'Peter O.', verified: true, rating: 5, date: '2 weeks ago', text: 'Great for beginners — very patient and encouraging.' },
    ],
    avgResponseTime: '4 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't8',
    name: 'Bola Fashola',
    title: 'Backend Engineer & Mentor',
    category: 'coding',
    tags: ['Java', 'Spring Boot', 'SQL'],
    experienceYears: 9,
    rating: 4.9,
    reviews: 150,
    education: 'MSc Computer Science',
    availability: 'weekdays',
    availabilityLabel: 'Available Tomorrow',
    sessionTypes: ['online', 'in-person'],
    price: 12000,
    status: 'Busy',
    type: 'expert',
    verified: true,
    location: 'Lagos, Nigeria',
    bio: 'With nearly a decade building backend systems at scale, I mentor students on writing clean, production-ready code — not just code that runs.',
    languages: [{ name: 'English', level: 'Native' }],
    educationDetail: 'MSc Computer Science, University of Lagos',
    expertise: ['Java', 'Spring Boot', 'SQL', 'System Design', 'API Design', 'Software Architecture'],
    studentsTaught: 260,
    experienceHistory: [
      { role: 'Staff Backend Engineer', org: 'Paystack', period: '2019 – Present' },
      { role: 'Backend Developer', org: 'Interswitch', period: '2015 – 2019' },
    ],
    outcomes: [
      'Design and build robust backend systems',
      'Understand databases and system design tradeoffs',
      'Write clean, maintainable, production-grade code',
      'Prepare for backend engineering interviews',
    ],
    ratingBreakdown: ratingBreakdownFor(4.9),
    reviewsList: [
      { name: 'Emmanuel D.', verified: true, rating: 5, date: '3 days ago', text: 'Bola has a decade of real experience and it shows in every session.' },
    ],
    avgResponseTime: '3 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't9',
    name: 'Ngozi Eze',
    title: 'Data Analytics Consultant',
    category: 'data',
    tags: ['Excel', 'Power BI', 'Statistics'],
    experienceYears: 7,
    rating: 4.7,
    reviews: 58,
    education: 'MSc Statistics',
    availability: 'weekends',
    availabilityLabel: 'Available Weekends',
    sessionTypes: ['online'],
    price: 8500,
    status: 'Online',
    type: 'professional',
    verified: true,
    location: 'Port Harcourt, Nigeria',
    bio: 'I help students turn spreadsheets into insight, focusing on the analytical thinking behind good dashboards, not just the tools.',
    languages: [{ name: 'English', level: 'Native' }],
    educationDetail: 'MSc Statistics, University of Port Harcourt',
    expertise: ['Excel', 'Power BI', 'Statistics', 'Data Visualization', 'Business Analytics'],
    studentsTaught: 87,
    experienceHistory: [
      { role: 'Data Analytics Consultant', org: 'Freelance', period: '2020 – Present' },
      { role: 'Business Analyst', org: 'Shell Nigeria', period: '2016 – 2020' },
    ],
    outcomes: [
      'Build professional dashboards in Power BI',
      'Master Excel for real-world analysis',
      'Understand statistics behind business decisions',
    ],
    ratingBreakdown: ratingBreakdownFor(4.7),
    reviewsList: [
      { name: 'Rita A.', verified: true, rating: 5, date: '2 weeks ago', text: 'Ngozi made Power BI actually make sense to me.' },
    ],
    avgResponseTime: '5 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't10',
    name: 'Emeka Obi',
    title: 'Debate & Presentation Coach',
    category: 'speaking',
    tags: ['Debate', 'Confidence'],
    experienceYears: 1,
    rating: 4.5,
    reviews: 22,
    education: 'BA English',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online'],
    price: 4500,
    status: 'Online',
    type: 'university',
    verified: false,
    location: 'Enugu, Nigeria',
    bio: "A former national debate champion, I coach students on building arguments, thinking quickly, and speaking with conviction.",
    languages: [{ name: 'English', level: 'Native' }, { name: 'Igbo', level: 'Conversational' }],
    educationDetail: 'BA English, University of Nigeria, Nsukka',
    expertise: ['Debate', 'Confidence Building', 'Argument Structure', 'Public Speaking'],
    studentsTaught: 29,
    experienceHistory: [
      { role: 'Debate Coach', org: 'Freelance', period: '2024 – Present' },
    ],
    outcomes: [
      'Structure and defend a strong argument',
      'Speak confidently under pressure',
      'Improve quick, critical thinking in debate formats',
    ],
    ratingBreakdown: ratingBreakdownFor(4.5),
    reviewsList: [
      { name: 'Nkechi B.', verified: true, rating: 4, date: '1 week ago', text: 'Really helped my son prepare for his school debate competition.' },
    ],
    avgResponseTime: '6 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't11',
    name: 'Chidinma Okoro',
    title: 'Sciences & Math Tutor',
    category: 'math',
    tags: ['Physics', 'Chemistry', 'Math'],
    experienceYears: 8,
    rating: 4.9,
    reviews: 134,
    education: 'BSc Physics',
    availability: 'now',
    availabilityLabel: 'Available Today',
    sessionTypes: ['online', 'in-person'],
    price: 9500,
    status: 'Online',
    type: 'expert',
    verified: true,
    location: 'Lagos, Nigeria',
    bio: 'I have spent nearly a decade helping students fall back in love with the sciences, connecting formulas to the real world around them.',
    languages: [{ name: 'English', level: 'Native' }],
    educationDetail: 'BSc Physics, University of Lagos',
    expertise: ['Physics', 'Chemistry', 'Mathematics', 'Exam Preparation', 'Problem Solving'],
    studentsTaught: 245,
    experienceHistory: [
      { role: 'Sciences Tutor', org: 'Bright Minds Academy', period: '2017 – Present' },
      { role: 'Physics Teacher', org: 'Corona Secondary School', period: '2014 – 2017' },
    ],
    outcomes: [
      'Build strong fundamentals across physics, chemistry and math',
      'Approach exam questions with confidence',
      'Connect science concepts to real-world examples',
    ],
    ratingBreakdown: ratingBreakdownFor(4.9),
    reviewsList: [
      { name: 'Tayo F.', verified: true, rating: 5, date: '4 days ago', text: 'Chidinma is the reason my daughter now enjoys physics.' },
    ],
    avgResponseTime: '2 hours',
    faqs: DEFAULT_FAQS,
  },
  {
    id: 't12',
    name: 'Yusuf Bello',
    title: 'Startup & Business Mentor',
    category: 'business',
    tags: ['Entrepreneurship', 'Finance'],
    experienceYears: 10,
    rating: 4.8,
    reviews: 71,
    education: 'MBA',
    availability: 'weekdays',
    availabilityLabel: 'Available Tomorrow',
    sessionTypes: ['online'],
    price: 15000,
    status: 'Busy',
    type: 'expert',
    verified: true,
    location: 'Kano, Nigeria',
    bio: 'I mentor young entrepreneurs on turning an idea into a real business — from the first business plan to pitching investors.',
    languages: [{ name: 'English', level: 'Native' }, { name: 'Hausa', level: 'Native' }],
    educationDetail: 'MBA, Lagos Business School',
    expertise: ['Entrepreneurship', 'Business Planning', 'Financial Literacy', 'Pitching', 'Marketing Basics'],
    studentsTaught: 118,
    experienceHistory: [
      { role: 'Startup Mentor', org: 'Kano Innovation Hub', period: '2018 – Present' },
      { role: 'Founder', org: 'Bello Ventures', period: '2013 – 2018' },
    ],
    outcomes: [
      'Turn a business idea into a working plan',
      'Understand the fundamentals of business finance',
      'Build and deliver a confident investor pitch',
    ],
    ratingBreakdown: ratingBreakdownFor(4.8),
    reviewsList: [
      { name: 'Amina S.', verified: true, rating: 5, date: '1 week ago', text: 'Yusuf gave my son the confidence to actually launch his first small business.' },
    ],
    avgResponseTime: '4 hours',
    faqs: DEFAULT_FAQS,
  },
];

export function getTutorById(id: string): Tutor | undefined {
  return TUTORS.find((t) => t.id === id);
}

export function getWeeklySchedule(status: 'Online' | 'Busy') {
  return status === 'Busy' ? WEEKLY_SCHEDULE_BUSY : WEEKLY_SCHEDULE_FULL;
}
