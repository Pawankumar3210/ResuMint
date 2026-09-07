import type { Resume } from "@/types/resume";
import { ExperienceType } from "@/types/resume";
import { DEFAULT_SECTION_ORDER } from "@/constants/resume-defaults";

/**
 * Realistic student/fresh-grad resume used by "Try Demo Resume". Every
 * field is fictional but plausible -- no real person, per copyright/PII
 * hygiene, and deliberately shows off every section so a new user can
 * see the full builder + preview capability at a glance.
 */
export const DEMO_RESUME: Resume = {
  personal: {
    fullName: "Aarav Mehta",
    email: "aaravmehta@gmail.com",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    linkedin: "linkedin.com/in/aaravmehta",
    github: "github.com/aaravmehta",
    portfolio: "",
  },
  summary: {
    text: "Computer Science student at Sapthagiri NPS University with strong foundation in Data Structures, Algorithms, OOP and DBMS. Proficient in Java, Python, JavaScript, React and SQL with hands-on experience building responsive web applications and academic projects. Passionate about problem-solving, clean code and learning new technologies. Eager to contribute as a Software Developer in a growth-oriented team and build scalable, user-focused products.",
  },
  education: [
    {
      id: "demo-edu-1",
      institution: "Sapthagiri NPS University",
      degree: "B.E",
      branch: "Computer Science and Engineering",
      grade: "8.5 CGPA",
      startMonth: "Oct",
      startYear: "2024",
      endMonth: "Jul",
      endYear: "2028",
    },
  ],
  experience: [
    {
      id: "demo-exp-1",
      type: ExperienceType.Internship,
      organization: "The Sparks Foundation",
      role: "Web Development Intern",
      description:
        "Developed payment gateway integration for an NGO platform (Remote). Improved the Lighthouse performance score from 62 to 94.",
      startMonth: "Oct",
      startYear: "2025",
      endMonth: "Jun",
      endYear: "2026",
      current: false,
    },
    {
      id: "demo-exp-2",
      type: ExperienceType.Internship,
      organization: "Razorpay",
      role: "Software Development Intern",
      description:
        "Built an internal dashboard using React and TypeScript (Bangalore, Remote), reducing manual ops effort by 40%. Implemented REST APIs in Node.js with 99.9% uptime, optimized SQL queries, and collaborated with the product team in Agile sprints.",
      startMonth: "Aug",
      startYear: "2026",
      endMonth: "",
      endYear: "",
      current: true,
    },
  ],
  projects: [
    {
      id: "demo-proj-1",
      name: "CampusEats",
      description:
        "A food ordering platform for college campuses handling 200+ daily orders, with real-time order tracking and a Node.js/Express backend.",
      githubUrl: "github.com/aaravmehta/campuseats",
      liveUrl: "",
    },
    {
      id: "demo-proj-2",
      name: "Travel Planner",
      description:
        "A platform which helps you decide destinations to travel, plan budget, and also gives information about local culture and favourite spots.",
      githubUrl: "github.com/aaravmehta/travelplanner",
      liveUrl: "",
    },
  ],
  skills: [
    { id: "demo-skill-1", label: "JavaScript", category: "languages" },
    { id: "demo-skill-2", label: "TypeScript", category: "languages" },
    { id: "demo-skill-3", label: "Python", category: "languages" },
    { id: "demo-skill-4", label: "React", category: "frameworks" },
    { id: "demo-skill-5", label: "Node.js", category: "frameworks" },
    { id: "demo-skill-6", label: "Tailwind", category: "frameworks" },
    { id: "demo-skill-7", label: "Git", category: "tools" },
    { id: "demo-skill-8", label: "Docker", category: "tools" },
    { id: "demo-skill-9", label: "AWS", category: "tools" },
    { id: "demo-skill-10", label: "DSA", category: "other" },
    { id: "demo-skill-11", label: "System Design", category: "other" },
  ],
  certifications: [
    {
      id: "demo-cert-1",
      name: "AWS Certified Cloud Practitioner",
      organization: "Amazon Web Services",
      month: "Feb",
      year: "2026",
    },
  ],
  achievements: [{ id: "demo-ach-1", text: "Winner of SIH India Hackathon 2025" }],
  achievementsEnabled: true,
  languages: [
    { id: "demo-lang-1", label: "English" },
    { id: "demo-lang-2", label: "Kannada" },
    { id: "demo-lang-3", label: "Hindi" },
  ],
  declaration: {
    enabled: true,
    text: "I hereby declare that the information provided above is true to the best of my knowledge.",
    place: "Bengaluru",
    date: "May 20, 2025",
    showPlace: true,
    showDate: true,
    showSignature: true,
    showSignatureName: true,
    signatureName: "Aarav Mehta",
  },
  custom: {
    enabled: true,
    title: "Extracurricular Activities",
    body: "Core member, college coding club -- organized 2 campus-wide hackathons with 200+ participants.",
  },
  sectionOrder: DEFAULT_SECTION_ORDER,
};
