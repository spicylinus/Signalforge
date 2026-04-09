export type Brand = {
  id: string;
  name: string;
  industry: string;
  tone: string[];
  topics: string[];
  targetAudience: string;
  sampleContent: string | null;
};

export type JobType = "blog" | "social" | "newsletter";

export type GeneratedResult = {
  title: string | null;
  body: string;
  platform: string | null;
  wordCount: number;
};
