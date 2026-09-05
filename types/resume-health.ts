export type HealthStatus = "pass" | "warn";

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  suggestion?: string;
}

export interface ResumeHealthResult {
  score: number; // 0-100
  checks: HealthCheck[];
}
