import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url, { alias: { "@": root } });
const load = (file) => jiti.import(path.join(root, file));

const { analyzeResumeAgainstJob } = await load("utils/ats/analyze.ts");
const { extractJobDescription } = await load("utils/ats/jobDescription.ts");
const {
  checkpointMatchesJob,
  createAtsCheckpoint,
} = await load("utils/ats/checkpoint.ts");
const { buildAtsReportText } = await load("utils/ats/report.ts");
const { EMPTY_RESUME } = await load("constants/resume-defaults.ts");
const { buildResumePlainText } = await load("utils/plainTextExport.ts");

function makeResume(overrides = {}) {
  return {
    ...EMPTY_RESUME,
    ...overrides,
    personal: { ...EMPTY_RESUME.personal, ...(overrides.personal ?? {}) },
    summary: { ...EMPTY_RESUME.summary, ...(overrides.summary ?? {}) },
  };
}

function byLabel(analysis) {
  return new Map(analysis.keywords.map((keyword) => [keyword.label, keyword]));
}

const SAMPLE_JD = `Job Title: Senior Frontend Engineer
Requirements:
- 3+ years of experience with React and TypeScript
- Experience with PostgreSQL and REST APIs
- No Kubernetes experience required.
- React to feedback quickly
- C++17 and C# 10 are a plus
Bachelor's degree required.
AWS certification preferred.
`;

const SAMPLE_RESUME = makeResume({
  personal: {
    fullName: "Test User",
    email: "test@example.com",
    phone: "9876543210",
  },
  summary: {
    text: "Frontend engineer with strong React and TypeScript experience building accessible products.",
  },
  experience: [
    {
      id: "exp-1",
      type: "Full-Time",
      organization: "Acme",
      role: "Frontend Engineer",
      description:
        "Built dashboards with React and SQL. Improved performance by 30%.",
      startMonth: "Jan",
      startYear: "2020",
      endMonth: "Jan",
      endYear: "2022",
      current: false,
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "Example University",
      degree: "B.Tech",
      branch: "Computer Science",
      grade: "8.5",
      startMonth: "Jan",
      startYear: "2016",
      endMonth: "Jan",
      endYear: "2020",
    },
  ],
  skills: [
    { id: "skill-1", label: "React", category: "frameworks" },
    { id: "skill-2", label: "SQL", category: "tools" },
  ],
});

test("extracts priorities, experience, degree, and certification hints", () => {
  const extraction = extractJobDescription(SAMPLE_JD);
  const keywords = new Map(
    extraction.keywords.map((keyword) => [keyword.label, keyword])
  );

  assert.equal(extraction.roleTitle, "Senior Frontend Engineer");
  assert.equal(extraction.requirements.minExperienceYears, 3);
  assert.equal(extraction.requirements.degreeLevel, "bachelor");
  assert.deepEqual(extraction.requirements.certifications, ["AWS certification"]);
  assert.equal(keywords.get("React")?.priority, "critical");
  assert.equal(keywords.get("C++")?.priority, "preferred");
  assert.equal(keywords.get("AWS")?.priority, "preferred");
  assert.equal(keywords.has("Kubernetes"), false);
  assert.equal(keywords.has("C"), false);
});

test("keeps negated, ambiguous, and inclusive mentions honest", () => {
  const negated = extractJobDescription(
    "Requirements:\n- No prior experience with Kubernetes required.\n- React is not required.\n- We do not require Docker."
  );
  assert.deepEqual(
    negated.keywords.map((keyword) => keyword.label).sort(),
    []
  );

  const ambiguous = extractJobDescription(
    "Requirements:\n- React to feedback quickly and communicate clearly."
  );
  assert.equal(
    ambiguous.keywords.some((keyword) => keyword.label === "React"),
    false
  );

  const inclusive = extractJobDescription(
    "Requirements:\n- Experience with tools including but not limited to React and Vue."
  );
  const labels = inclusive.keywords.map((keyword) => keyword.label);
  assert.ok(labels.includes("React"));
  assert.ok(labels.includes("Vue"));
});

test("reads a years range as its minimum and finds related resume evidence", () => {
  const range = extractJobDescription(
    "Nice to have:\n- 3-5 years of experience with Go."
  );
  assert.equal(range.requirements.minExperienceYears, 3);

  const analysis = analyzeResumeAgainstJob(SAMPLE_RESUME, SAMPLE_JD);
  const keywords = byLabel(analysis);
  const postgres = keywords.get("PostgreSQL");

  assert.equal(postgres?.coverage, "none");
  assert.deepEqual(postgres?.relatedSkills, ["SQL"]);
  assert.equal(keywords.get("React")?.coverage, "strong");
});

test("compares stated requirements without overstating them", () => {
  const analysis = analyzeResumeAgainstJob(SAMPLE_RESUME, SAMPLE_JD);
  const experience = analysis.requirements.find(
    (check) => check.id === "experience-years"
  );
  const education = analysis.requirements.find(
    (check) => check.id === "education-degree"
  );

  assert.equal(experience?.status, "warning");
  assert.match(experience?.detail ?? "", /2\.1 years/);
  assert.equal(education?.status, "pass");
});

test("builds checkpoints, detects job changes, and writes a report", () => {
  const analysis = analyzeResumeAgainstJob(SAMPLE_RESUME, SAMPLE_JD);
  const checkpoint = createAtsCheckpoint(analysis, SAMPLE_JD);

  assert.equal(checkpoint.jobMatch, analysis.scores.jobMatch);
  assert.ok(checkpoint.missingCritical.includes("PostgreSQL"));
  assert.equal(checkpointMatchesJob(checkpoint, SAMPLE_JD), true);
  assert.equal(
    checkpointMatchesJob(checkpoint, `${SAMPLE_JD}\n- Extra requirement`),
    false
  );

  const report = buildAtsReportText({
    analysis,
    resumeName: "Test Resume",
    checkpoint,
    checkpointMatchesJob: true,
  });

  assert.match(report, /RESUMINT ATS REPORT/);
  assert.match(report, /Resume: Test Resume/);
  assert.match(report, /MUST-HAVE GAPS/);
  assert.match(report, /PostgreSQL/);
  assert.match(report, /SQL/);
});

test("plain-text preview keeps section headings and content readable", () => {
  const analysis = analyzeResumeAgainstJob(SAMPLE_RESUME, SAMPLE_JD);
  const text = buildResumePlainText(SAMPLE_RESUME);

  assert.ok(analysis.keywords.length > 0);
  assert.match(text, /TEST USER/);
  assert.match(text, /EXPERIENCE/);
  assert.match(text, /SKILLS/);
  assert.match(text, /React/);
});
