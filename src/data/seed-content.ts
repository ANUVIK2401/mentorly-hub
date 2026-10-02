/**
 * Content pools for the synthetic seed. Everything here is fictional.
 * Edit freely: add industries, subjects or skills and the generator picks them up.
 * (Titles are verb x subject, so unique project count = verbs x subjects x industries.)
 */

export interface IndustrySeed {
  id: string;
  name: string;
  skills: string[];
  /** Noun phrases. Combined with VERBS to form project titles. Keep exactly SUBJECTS_PER_INDUSTRY. */
  subjects: string[];
  deliverables: string[];
  roles: string[];
}

export const SUBJECTS_PER_INDUSTRY = 12;

export const VERBS = [
  "Build",
  "Analyze",
  "Design",
  "Evaluate",
  "Prototype",
  "Audit",
  "Plan",
  "Benchmark",
  "Optimize",
  "Present",
  "Model",
  "Stress-Test",
] as const;

export const MAX_UNIQUE_PROJECTS = VERBS.length * SUBJECTS_PER_INDUSTRY * 8;

export const ORGANIZATIONS = [
  "Cascadia Learning Foundation",
  "Meridian Project Labs",
  "Fieldstone Institute",
];

export const INDUSTRIES: IndustrySeed[] = [
  {
    id: "finance",
    name: "Finance",
    skills: [
      "Financial Modeling",
      "Valuation",
      "Excel",
      "Risk Analysis",
      "Portfolio Theory",
      "Fixed Income",
      "Equity Research",
      "Python for Finance",
    ],
    subjects: [
      "a Discounted Cash Flow Valuation of a Regional Retailer",
      "a Credit Risk Scorecard for Small-Business Lending",
      "a Dividend Growth Portfolio",
      "a Startup Cap Table and Funding Round",
      "an Interest Rate Hedging Strategy",
      "a Subscription Company's Financial Statements",
      "an Equity Research Note on a Consumer Brand",
      "a Hypothetical Acquisition Between Two Mid-Size Companies",
      "a Municipal Bond Ladder",
      "a Fraud Detection Review for Payment Data",
      "a Commodity Price Risk Report",
      "a Personal Finance Product for Young Professionals",
    ],
    deliverables: [
      "A fully linked financial model with a one-page investment summary",
      "A written recommendation memo with supporting spreadsheets",
      "A 10-slide pitch to a mock investment committee",
      "A risk report with scenario analysis",
    ],
    roles: ["Senior Analyst", "Portfolio Manager", "Credit Officer"],
  },
  {
    id: "business",
    name: "Business",
    skills: [
      "Market Research",
      "Strategy",
      "Pricing",
      "Operations",
      "Go-to-Market",
      "Presentation",
      "Stakeholder Management",
      "Business Analysis",
    ],
    subjects: [
      "a Go-to-Market Approach for a B2B Software Launch",
      "a Pricing Strategy for a Subscription Service",
      "a Market Entry Strategy for a New Region",
      "a Customer Segmentation for a Retail Chain",
      "a Supply Chain Resilience Review",
      "an Operations Review for a Clinic Network",
      "a Brand Positioning Strategy for a Local Food Company",
      "a Business Case for an Internal Automation Tool",
      "a Competitive Landscape Map for Electric Bikes",
      "a Hiring and Onboarding Playbook for a Growing Startup",
      "a Sustainability Reporting Roadmap",
      "a Partnership Strategy for a Marketplace Platform",
    ],
    deliverables: [
      "A 12-page strategy document with an executive summary",
      "A slide deck presented to a mock executive panel",
      "A market sizing workbook and recommendation memo",
      "A one-page business case with a financial appendix",
    ],
    roles: ["Strategy Consultant", "Product Marketing Lead", "Operations Manager"],
  },
  {
    id: "data-science",
    name: "Data Science",
    skills: [
      "Python",
      "SQL",
      "Machine Learning",
      "Statistics",
      "Data Visualization",
      "Pandas",
      "Experimentation",
      "MLOps",
    ],
    subjects: [
      "a Demand Forecast for a Grocery Chain",
      "a Churn Prediction Pipeline for a Streaming Service",
      "an A/B Testing Framework for a Mobile App",
      "a Recommendation Engine for an Online Bookstore",
      "a Dashboard for Public Transit Ridership",
      "a Text Classification System for Support Tickets",
      "an Anomaly Detection Workflow for Sensor Data",
      "an Urban Heat Map of a Mid-Size City",
      "a Feature Store for a Small ML Team",
      "a Survey on Remote Work Habits",
      "a Time Series of Household Energy Consumption",
      "a Drift Monitoring Setup for a Credit Scoring System",
    ],
    deliverables: [
      "A reproducible notebook and a short written report",
      "A deployed dashboard with documented methodology",
      "A trained model with an evaluation write-up",
      "A pipeline repository with tests and a README",
    ],
    roles: ["Senior Data Scientist", "ML Engineer", "Analytics Lead"],
  },
  {
    id: "computer-science",
    name: "Computer Science",
    skills: [
      "TypeScript",
      "Python",
      "System Design",
      "APIs",
      "Cloud",
      "Testing",
      "Databases",
      "DevOps",
    ],
    subjects: [
      "a REST API for a Campus Events App",
      "a Rate Limiter for a High-Traffic Service",
      "a CI/CD Pipeline for a Small Team",
      "a Real-Time Chat Service",
      "a Search Index for Technical Documentation",
      "a Command-Line Tool for Log Analysis",
      "a Cloud Deployment on a Free-Tier Budget",
      "a Browser-Based Code Playground",
      "a Job Queue with Retries and Dead Letters",
      "a Linting Tool for Common Bugs",
      "a Collaborative Whiteboard App",
      "a Retrieval-Augmented Assistant for Course Notes",
    ],
    deliverables: [
      "A deployed service with a public repository and README",
      "A tested module with documentation and usage examples",
      "A system design document and working prototype",
      "A demo video and a technical write-up",
    ],
    roles: ["Staff Engineer", "Engineering Manager", "Platform Engineer"],
  },
  {
    id: "engineering",
    name: "Engineering",
    skills: [
      "CAD",
      "Simulation",
      "Systems Engineering",
      "Materials",
      "Controls",
      "Project Management",
      "MATLAB",
      "Technical Writing",
    ],
    subjects: [
      "a Small Wind Turbine Blade",
      "a Battery Pack Thermal Management Concept",
      "a Footbridge Under Pedestrian Loads",
      "a Warehouse Layout for Faster Picking",
      "a Water Filtration Unit for a Rural School",
      "a Robotic Arm Pick-and-Place Cell",
      "a Solar Microgrid for a Small Campus",
      "a Quality Inspection Process for a Machined Part",
      "an HVAC Efficiency Retrofit for an Office Building",
      "a Lightweight Bracket Using Topology Optimization",
      "a Sensor Network for Structural Monitoring",
      "a Medical Device Housing and Its Failure Risks",
    ],
    deliverables: [
      "A design report with calculations and drawings",
      "A simulation study with a validation summary",
      "A prototype specification and test plan",
      "A technical presentation to a mock review board",
    ],
    roles: ["Design Engineer", "Systems Engineer", "Project Engineer"],
  },
  {
    id: "law",
    name: "Law",
    skills: [
      "Legal Research",
      "Legal Writing",
      "Contract Drafting",
      "Compliance",
      "Negotiation",
      "Oral Advocacy",
      "Policy Analysis",
      "Due Diligence",
    ],
    subjects: [
      "a Legal Memo on a Data Privacy Dispute",
      "a Term Sheet Negotiation for a Seed Round",
      "a Contract Review for a Software License",
      "a Compliance Checklist for a Fintech Startup",
      "a Mock Trial Brief on a Landlord-Tenant Case",
      "an Intellectual Property Strategy for a Creative Studio",
      "a Policy Position on Algorithmic Hiring Tools",
      "an Employment Handbook for a 50-Person Company",
      "a Regulatory Comparison of Drone Rules Across Regions",
      "a Due Diligence Report for a Small Acquisition",
      "an Oral Argument on a Free Speech Question",
      "a Nonprofit Governance Review",
    ],
    deliverables: [
      "A polished legal memorandum",
      "An annotated contract with a negotiation summary",
      "A moot-style brief and a recorded oral argument",
      "A compliance matrix with a policy recommendation",
    ],
    roles: ["Corporate Counsel", "Associate Attorney", "Policy Counsel"],
  },
  {
    id: "biology-healthcare",
    name: "Biology & Healthcare",
    skills: [
      "Biostatistics",
      "Clinical Research",
      "Public Health",
      "Bioinformatics",
      "Regulatory Affairs",
      "Lab Methods",
      "Health Policy",
      "R",
    ],
    subjects: [
      "a Randomized Trial for a Sleep Intervention",
      "a Literature Review on Gut Microbiome Research",
      "a Public Health Campaign for Vaccine Uptake",
      "a Genomics Pipeline for Variant Annotation",
      "a Hospital Readmission Dataset",
      "a Regulatory Pathway for a Wearable Health Device",
      "a Protein Structure Exploration Using Public Data",
      "a Patient Intake Workflow for a Busy Clinic",
      "a Health Equity Dashboard for a County",
      "a Lab Safety and Quality Protocol",
      "a Nutrition Study Using Open Datasets",
      "a Telehealth Adoption Study for Rural Clinics",
    ],
    deliverables: [
      "A study protocol with an analysis plan",
      "A literature review with an evidence table",
      "A data analysis report with figures and methods",
      "A policy brief for a non-specialist audience",
    ],
    roles: ["Research Scientist", "Clinical Researcher", "Public Health Analyst"],
  },
  {
    id: "design",
    name: "Design",
    skills: [
      "UX Research",
      "Figma",
      "Prototyping",
      "Visual Design",
      "Accessibility",
      "Information Architecture",
      "Brand Strategy",
      "Design Systems",
    ],
    subjects: [
      "a Campus Mobile App for Course Planning",
      "a Component Library and Style Guide for a Small SaaS Product",
      "a Usability Study for an Online Checkout",
      "a Public Website's Accessibility",
      "a Brand Identity for a Community Garden",
      "a Service Blueprint for a City Library",
      "a Motion Graphics Reel for a Product Launch",
      "a Wayfinding Concept for a Hospital",
      "an Onboarding Flow for a Budgeting App",
      "an Editorial Layout for a Research Report",
      "a Data Storytelling Piece on Climate Trends",
      "a Packaging Concept for a Sustainable Snack Brand",
    ],
    deliverables: [
      "A clickable prototype with a case study",
      "A usability report with prioritized recommendations",
      "A design system starter kit",
      "A portfolio-ready case study with process documentation",
    ],
    roles: ["Product Designer", "UX Researcher", "Design Lead"],
  },
];

export const FIRST_NAMES = [
  "Amara", "Daniel", "Priya", "Mateo", "Chloe", "Kenji", "Fatima", "Lucas", "Sofia", "Omar",
  "Hannah", "Ravi", "Elena", "Tomas", "Aisha", "Noah", "Mei", "Gabriel", "Zara", "Ivan",
  "Leila", "Marcus", "Yuki", "Isabel", "Nikhil", "Camille", "Sam", "Anika", "Diego", "Tessa",
  "Rohan", "Ingrid", "Callum", "Nadia", "Felix", "Imani", "Hugo", "Sana", "Owen", "Lena",
];

export const LAST_NAMES = [
  "Okafor", "Lindqvist", "Banerjee", "Alvarez", "Whitfield", "Tanaka", "Haddad", "Moreau",
  "Castellanos", "Rahman", "Brennan", "Iyer", "Kowalski", "Mbeki", "Nakamura", "Fontaine",
  "Aguilar", "Petrov", "Sandoval", "Hartmann", "Oyelaran", "Choudhury", "Vasquez", "Eriksen",
  "Yilmaz", "Delgado", "Marchetti", "Osei", "Bergstrom", "Takahashi", "Reyes", "Novak",
  "Abara", "Lund", "Pereira", "Singh", "Dufour", "Kessler", "Adeyemi", "Rowe",
];

export const SCHOOLS = [
  "Lakeview University",
  "Redwood State University",
  "Harbor City College",
  "Summit Institute of Technology",
  "Prairie Valley University",
  "Eastbrook College",
];

export const PROGRAMS = [
  "B.S. Computer Science",
  "B.A. Economics",
  "M.S. Data Science",
  "B.S. Mechanical Engineering",
  "B.A. Political Science",
  "M.B.A.",
  "B.S. Biology",
  "B.F.A. Design",
  "M.S. Public Health",
  "B.S. Finance",
];

export const STATEMENTS = [
  "I want hands-on experience with a realistic problem before I graduate. I have done related coursework and a short internship, and I am ready to commit the time each week.",
  "This project matches the direction I want my career to take. I learn best by building something end to end, and I would value feedback from a working practitioner.",
  "I am changing fields and need a concrete deliverable to show employers. I can dedicate evenings and weekends and I am comfortable working in a small team.",
  "My coursework covered the theory, but I have not applied it to an open-ended brief. I am looking for structure, deadlines, and honest critique of my work.",
];
