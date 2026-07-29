export type Role = 'Student' | 'Faculty' | 'Officer' | 'Admin'
export type DocStatus = 'Indexed' | 'Processing' | 'Failed'
export type ConfidenceLevel = 'high' | 'medium' | 'none'
export type MessageRole = 'user' | 'assistant'

export interface Source {
  id: string
  title: string
  type: 'PDF' | 'DOCX' | 'Circular'
  page: string
  section: string
  snippet: string
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  sources?: Source[]
  confidence?: ConfidenceLevel
  followUps?: string[]
  bookmarked?: boolean
}

export interface Conversation {
  id: string
  title: string
  preview: string
  timestamp: Date
  messageCount: number
  messages: Message[]
}

export interface Document {
  id: string
  title: string
  category: string
  uploadDate: string
  status: DocStatus
  fileType: 'PDF' | 'DOCX' | 'XLSX'
  fileSize: string
  pages: number
  summary: string
  tags: string[]
  versions: number
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department: string
  status: 'Active' | 'Inactive' | 'Pending'
  lastActive: string
  queriesThisMonth: number
  avatar: string
}

// ─── Conversations ────────────────────────────────────────────────────────────
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    title: 'Scholarship Eligibility Rules',
    preview: 'What are the income criteria for state merit scholarship?',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    messageCount: 6,
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What are the income criteria for state merit scholarship?',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: `## State Merit Scholarship — Income Criteria

The **State Merit Scholarship** for higher education is governed by the guidelines issued by the Higher & Technical Education Department (Circular No. HTE/SCH/2023/14).

### Key Eligibility Thresholds

| Category | Annual Family Income Limit |
|---|---|
| General | ₹8,00,000 |
| OBC / NT / SBC | ₹10,00,000 |
| SC / ST / VJ-DT | ₹12,00,000 (no income cap for SC/ST in some schemes) |

### Additional Conditions
- The student must have secured **≥ 60% marks** in the qualifying examination (55% for reserved categories).
- Domicile of Maharashtra for a **minimum of 15 years** prior to application.
- Enrolled in a **government-approved institution** affiliated with a recognised university.
- Only **one scholarship per family** is permissible at a time.

> **Note:** Income is computed as per the latest income certificate issued by a Tahsildar (not older than 3 years). Refer to Annexure B of Circular HTE/SCH/2023/14 for the full list of acceptable documents.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 19),
        confidence: 'high',
        sources: [
          {
            id: 's1',
            title: 'State Merit Scholarship Guidelines 2023',
            type: 'PDF',
            page: '7',
            section: '3.2 — Eligibility Criteria',
            snippet: 'Annual family income shall not exceed ₹8,00,000 for general category applicants as per Annexure B…',
          },
          {
            id: 's2',
            title: 'HTE Circular No. HTE/SCH/2023/14',
            type: 'Circular',
            page: '2',
            section: 'Para 4',
            snippet: 'Domicile requirement: the applicant must be a permanent resident of Maharashtra for not less than 15 years…',
          },
        ],
        followUps: [
          'How do I apply for the scholarship online?',
          'What documents are required for income proof?',
          'Can I apply for multiple scholarships simultaneously?',
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'AICTE Circular on EV Technology',
    preview: 'Latest AICTE circular on Electric Vehicle curriculum?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
    messageCount: 4,
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'What does the latest AICTE circular say about Electric Vehicle technology curriculum?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        id: 'm4',
        role: 'assistant',
        content: `## AICTE Circular — EV Technology Curriculum (2024)

AICTE issued Circular F.No.7-57/RIFD/AICTE/RPS/Policy/2024 directing all approved technical institutions to **integrate Electric Vehicle (EV) technology** modules into existing engineering programmes by the academic year 2025–26.

### Mandatory Additions
- **EV Fundamentals** (3 credits) — Battery chemistry, BMS, power electronics
- **Charging Infrastructure Design** (2 credits) — Level 1/2/3 charger design, grid integration
- **Motor Drive Systems** (2 credits) — BLDC, PMSM, traction inverters

### Implementation Timeline
1. **2024–25**: Curriculum design & faculty training
2. **2025–26**: Full rollout for B.Tech (EE / ME / Auto) — Year 3
3. **2026–27**: Optional minor specialisation available across branches

### Funding Support
Institutions can apply for a **₹25 lakh lab setup grant** under the AICTE-IDEA Lab scheme. Deadline: 31 October 2024.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3 + 30000),
        confidence: 'high',
        sources: [
          {
            id: 's3',
            title: 'AICTE Circular F.No.7-57/RIFD/2024',
            type: 'Circular',
            page: '1',
            section: 'Directive 2.1',
            snippet: 'All AICTE-approved institutions offering B.E./B.Tech. programmes shall integrate EV technology…',
          },
        ],
        followUps: [
          'How to apply for AICTE-IDEA Lab grant?',
          'Which universities have already adopted this curriculum?',
          'What are the faculty qualification requirements?',
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Exam Re-evaluation Process',
    preview: 'Exam re-evaluation timeline and fees',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
    messageCount: 8,
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: 'What is the re-evaluation process for university exams?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
      {
        id: 'm6',
        role: 'assistant',
        content: `## University Examination Re-Evaluation Process

The re-evaluation process is governed by the **Maharashtra Universities Act, 1994** and individual university statutes. The general procedure is as follows:

### Step-by-Step Process

1. **Application Window**: Within **15 days** of result declaration
2. **Fee Payment**: ₹500–₹700 per paper (varies by university)
3. **Submission**: Online portal of the respective university + hard copy to exam section
4. **Re-evaluation Timeline**: Results within **45 working days**

### Types of Review Available
- **Photocopy of Answer Book** — ₹300 (must apply before re-evaluation)
- **Re-totalling** — ₹150 (arithmetic check only)
- **Re-evaluation** — ₹500–₹700 (full re-checking by second examiner)

### Important Notes
- Re-evaluation is **not available for practical/viva** examinations.
- If marks **increase**, the fee is refunded.
- The re-evaluated marks are **final and binding**.`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26 + 30000),
        confidence: 'high',
        sources: [
          {
            id: 's4',
            title: 'Maharashtra Universities Act 1994 — Examination Chapter',
            type: 'PDF',
            page: '42',
            section: 'Section 67 — Re-evaluation',
            snippet: 'A candidate may apply for re-evaluation within 15 days of the declaration of results on payment of prescribed fee…',
          },
        ],
        followUps: [
          'Can I apply for photocopy and re-evaluation simultaneously?',
          'Which university has the fastest re-evaluation turnaround?',
          'What happens if marks decrease in re-evaluation?',
        ],
      },
    ],
  },
  {
    id: 'c4',
    title: 'Minority Institution Grants',
    preview: 'Grants available for minority educational institutions',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    messageCount: 3,
    messages: [],
  },
  {
    id: 'c5',
    title: 'Faculty Recruitment Guidelines',
    preview: 'UGC norms for assistant professor qualification',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    messageCount: 10,
    messages: [],
  },
  {
    id: 'c6',
    title: 'NAAC Accreditation Process',
    preview: 'Documentation checklist for NAAC A+ rating',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    messageCount: 5,
    messages: [],
  },
]

// ─── Documents ────────────────────────────────────────────────────────────────
export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'State Merit Scholarship Guidelines 2023–24',
    category: 'Scholarships',
    uploadDate: '2023-08-15',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '2.4 MB',
    pages: 28,
    summary: 'Comprehensive guidelines for state merit scholarships including eligibility, income criteria, application process, and disbursement schedule for AY 2023–24.',
    tags: ['Scholarship', 'Eligibility', 'Income Criteria', 'Students'],
    versions: 2,
  },
  {
    id: 'd2',
    title: 'AICTE Circular — EV Technology Curriculum 2024',
    category: 'AICTE Circulars',
    uploadDate: '2024-02-10',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '1.1 MB',
    pages: 12,
    summary: 'Directive for integration of Electric Vehicle technology curriculum modules in B.Tech programmes by AY 2025–26, with IDEA Lab funding guidelines.',
    tags: ['AICTE', 'EV Technology', 'Curriculum', 'Engineering'],
    versions: 1,
  },
  {
    id: 'd3',
    title: 'Maharashtra Universities Act 1994',
    category: 'Legislation',
    uploadDate: '2022-01-01',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '8.7 MB',
    pages: 184,
    summary: 'Complete text of the Maharashtra Universities Act 1994 including examination regulations, university governance, and student rights provisions.',
    tags: ['Act', 'Examination', 'University Governance'],
    versions: 3,
  },
  {
    id: 'd4',
    title: 'UGC Regulations on Minimum Qualifications 2018',
    category: 'UGC Regulations',
    uploadDate: '2023-11-20',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '3.2 MB',
    pages: 45,
    summary: 'UGC minimum qualification norms for appointment and promotion of teachers in universities and colleges.',
    tags: ['UGC', 'Faculty', 'Recruitment', 'Qualifications'],
    versions: 2,
  },
  {
    id: 'd5',
    title: 'NAAC Assessment Framework 2022',
    category: 'Accreditation',
    uploadDate: '2024-01-05',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '5.6 MB',
    pages: 92,
    summary: 'Framework for assessment and accreditation of Higher Educational Institutions using the revised metric-based methodology.',
    tags: ['NAAC', 'Accreditation', 'Quality', 'Ranking'],
    versions: 1,
  },
  {
    id: 'd6',
    title: 'HTE Fee Regulation Order 2024–25',
    category: 'Fee Regulation',
    uploadDate: '2024-04-01',
    status: 'Processing',
    fileType: 'PDF',
    fileSize: '0.9 MB',
    pages: 8,
    summary: 'Annual fee regulation order for professional courses including engineering, pharmacy, and management for AY 2024–25.',
    tags: ['Fee', 'Regulation', 'Engineering', 'Management'],
    versions: 1,
  },
  {
    id: 'd7',
    title: 'Minority Institution Development Grant Scheme',
    category: 'Grants',
    uploadDate: '2024-03-12',
    status: 'Indexed',
    fileType: 'DOCX',
    fileSize: '0.6 MB',
    pages: 15,
    summary: 'Scheme guidelines for development grants to minority educational institutions including eligibility, application, and utilisation norms.',
    tags: ['Minority', 'Grant', 'Development', 'Institution'],
    versions: 2,
  },
  {
    id: 'd8',
    title: 'NEP 2020 Implementation Roadmap — Maharashtra',
    category: 'Policy',
    uploadDate: '2023-09-01',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '4.1 MB',
    pages: 56,
    summary: 'State-level roadmap for implementation of the National Education Policy 2020 across higher and technical education institutions in Maharashtra.',
    tags: ['NEP', 'Policy', 'Implementation', 'Roadmap'],
    versions: 1,
  },
  {
    id: 'd9',
    title: 'Diploma Programme Admission Rules 2024',
    category: 'Admissions',
    uploadDate: '2024-05-22',
    status: 'Failed',
    fileType: 'PDF',
    fileSize: '1.7 MB',
    pages: 22,
    summary: 'Rules and procedures for admission to diploma programmes in polytechnic institutions for AY 2024–25.',
    tags: ['Diploma', 'Admission', 'Polytechnic'],
    versions: 1,
  },
  {
    id: 'd10',
    title: 'Annual Report HTE Department 2022–23',
    category: 'Reports',
    uploadDate: '2023-12-15',
    status: 'Indexed',
    fileType: 'PDF',
    fileSize: '12.3 MB',
    pages: 210,
    summary: 'Annual report of the Higher & Technical Education Department covering key achievements, statistics, and policy initiatives for 2022–23.',
    tags: ['Annual Report', 'Statistics', 'Department'],
    versions: 1,
  },
  {
    id: 'd11',
    title: 'Research Incentive Scheme for Faculty',
    category: 'Research',
    uploadDate: '2024-02-28',
    status: 'Indexed',
    fileType: 'DOCX',
    fileSize: '0.4 MB',
    pages: 10,
    summary: 'Incentive scheme providing financial support to faculty members for publishing research papers in peer-reviewed journals.',
    tags: ['Research', 'Faculty', 'Incentive', 'Publication'],
    versions: 1,
  },
  {
    id: 'd12',
    title: 'Student Grievance Redressal Mechanism',
    category: 'Student Affairs',
    uploadDate: '2024-01-18',
    status: 'Processing',
    fileType: 'PDF',
    fileSize: '0.8 MB',
    pages: 14,
    summary: 'Standard operating procedure for student grievance redressal at the institutional, university, and department level.',
    tags: ['Grievance', 'Student', 'Redressal', 'SOP'],
    versions: 2,
  },
]

// ─── Users ────────────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Dr. Priya Sharma', email: 'priya.sharma@hte.gov.in', role: 'Admin', department: 'HTE Headquarters', status: 'Active', lastActive: '2 min ago', queriesThisMonth: 142, avatar: 'PS' },
  { id: 'u2', name: 'Prof. Rajesh Kumar', email: 'r.kumar@unipune.ac.in', role: 'Faculty', department: 'University of Pune', status: 'Active', lastActive: '1 hr ago', queriesThisMonth: 87, avatar: 'RK' },
  { id: 'u3', name: 'Ananya Desai', email: 'ananya.d@student.mu.ac.in', role: 'Student', department: 'Mumbai University', status: 'Active', lastActive: '3 hr ago', queriesThisMonth: 34, avatar: 'AD' },
  { id: 'u4', name: 'Suresh Patil', email: 's.patil@dghe.gov.in', role: 'Officer', department: 'Directorate of HE', status: 'Active', lastActive: 'Yesterday', queriesThisMonth: 201, avatar: 'SP' },
  { id: 'u5', name: 'Dr. Meera Joshi', email: 'meera.j@iitb.ac.in', role: 'Faculty', department: 'IIT Bombay', status: 'Active', lastActive: 'Yesterday', queriesThisMonth: 58, avatar: 'MJ' },
  { id: 'u6', name: 'Arjun Nair', email: 'arjun.n@student.coep.ac.in', role: 'Student', department: 'COEP Pune', status: 'Active', lastActive: '2 days ago', queriesThisMonth: 21, avatar: 'AN' },
  { id: 'u7', name: 'Kavita Rao', email: 'kavita.rao@hte.gov.in', role: 'Officer', department: 'HTE Scholarships Cell', status: 'Active', lastActive: '2 days ago', queriesThisMonth: 176, avatar: 'KR' },
  { id: 'u8', name: 'Dr. Vijay Kulkarni', email: 'v.kulkarni@nagpuruniv.ac.in', role: 'Faculty', department: 'Nagpur University', status: 'Inactive', lastActive: '12 days ago', queriesThisMonth: 9, avatar: 'VK' },
  { id: 'u9', name: 'Riya Mehta', email: 'riya.m@student.vnit.ac.in', role: 'Student', department: 'VNIT Nagpur', status: 'Active', lastActive: '4 days ago', queriesThisMonth: 16, avatar: 'RM' },
  { id: 'u10', name: 'Aditya Bhatt', email: 'a.bhatt@hte.gov.in', role: 'Admin', department: 'HTE IT Cell', status: 'Active', lastActive: '1 hr ago', queriesThisMonth: 95, avatar: 'AB' },
  { id: 'u11', name: 'Sunita Khadke', email: 's.khadke@dgvt.gov.in', role: 'Officer', department: 'DGVT Maharashtra', status: 'Pending', lastActive: 'Never', queriesThisMonth: 0, avatar: 'SK' },
  { id: 'u12', name: 'Rohan Wagh', email: 'rohan.w@student.sppu.ac.in', role: 'Student', department: 'SPPU Pune', status: 'Active', lastActive: '6 hr ago', queriesThisMonth: 42, avatar: 'RW' },
]

// ─── Analytics ────────────────────────────────────────────────────────────────
export const STAT_CARDS = [
  { label: 'Total Documents', value: '1,284', delta: '+42 this month', trend: 'up' as const, icon: 'FileText' },
  { label: 'Total Queries', value: '38,601', delta: '+2,140 this week', trend: 'up' as const, icon: 'MessageSquare' },
  { label: 'Avg. Response Time', value: '1.4s', delta: '−0.2s vs last month', trend: 'up' as const, icon: 'Zap' },
  { label: 'Active Users', value: '847', delta: '+63 this month', trend: 'up' as const, icon: 'Users' },
]

export const FAQ_DATA = [
  { question: 'Scholarship eligibility rules', count: 2840 },
  { question: 'AICTE approval process', count: 2310 },
  { question: 'Exam re-evaluation process', count: 1980 },
  { question: 'NEP 2020 implementation', count: 1720 },
  { question: 'Fee regulation order', count: 1540 },
  { question: 'Faculty recruitment norms', count: 1380 },
  { question: 'NAAC accreditation criteria', count: 1190 },
  { question: 'Minority institution grants', count: 980 },
]

export const QUERY_TREND_DATA = [
  { month: 'Jan', queries: 2800, users: 420 },
  { month: 'Feb', queries: 3200, users: 480 },
  { month: 'Mar', queries: 4100, users: 530 },
  { month: 'Apr', queries: 3800, users: 510 },
  { month: 'May', queries: 5200, users: 640 },
  { month: 'Jun', queries: 6100, users: 720 },
  { month: 'Jul', queries: 5800, users: 690 },
]

export const RESPONSE_TIME_DATA = [
  { day: 'Mon', time: 1.8 },
  { day: 'Tue', time: 1.5 },
  { day: 'Wed', time: 1.6 },
  { day: 'Thu', time: 1.3 },
  { day: 'Fri', time: 1.4 },
  { day: 'Sat', time: 1.2 },
  { day: 'Sun', time: 1.1 },
]

export const POPULAR_DOCS_DATA = [
  { name: 'Scholarship Guidelines', views: 4200 },
  { name: 'Maharashtra Univ. Act', views: 3600 },
  { name: 'AICTE EV Circular', views: 2900 },
  { name: 'UGC Qualifications', views: 2400 },
  { name: 'NEP 2020 Roadmap', views: 2100 },
]

export const CATEGORY_DATA = [
  { name: 'Scholarships', value: 285, color: '#6d5bf8' },
  { name: 'AICTE Circulars', value: 198, color: '#38bdf8' },
  { name: 'Legislation', value: 142, color: '#34d399' },
  { name: 'Accreditation', value: 127, color: '#fb923c' },
  { name: 'Others', value: 532, color: '#a78bfa' },
]

export const SUGGESTED_PROMPTS = [
  { label: 'Scholarship eligibility rules', icon: 'GraduationCap', description: 'Income limits, criteria & documents' },
  { label: 'Latest AICTE circular on EV technology', icon: 'Zap', description: 'Curriculum integration directive 2024' },
  { label: 'Exam re-evaluation process', icon: 'RefreshCw', description: 'Timeline, fees & how to apply' },
  { label: 'NAAC accreditation checklist', icon: 'CheckSquare', description: 'A++ rating documentation requirements' },
  { label: 'NEP 2020 implementation roadmap', icon: 'Map', description: 'Maharashtra state rollout plan' },
  { label: 'Faculty recruitment norms (UGC)', icon: 'Users', description: 'Minimum qualifications & NET/PhD rules' },
]

export const DOC_CATEGORIES = ['All', 'Scholarships', 'AICTE Circulars', 'Legislation', 'UGC Regulations', 'Accreditation', 'Fee Regulation', 'Grants', 'Policy', 'Admissions', 'Reports', 'Research', 'Student Affairs']
