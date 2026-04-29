import { z } from 'zod';

export const ReadinessAssessmentSchema = z.object({
  votingStatus: z.enum(['REGISTERED', 'NOT_REGISTERED', 'UNSURE']),
  confidence: z.number().min(1).max(5),
  location: z.string().optional(),
  familiarity: z.number().min(1).max(5),
  constraints: z.array(z.string()).optional(),
  isComplete: z.boolean().optional(),
});

export type ReadinessAssessment = z.infer<typeof ReadinessAssessmentSchema>;

export const TimelineStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['COMPLETED', 'NEXT', 'URGENT', 'VERIFY', 'LATER']),
  deadline: z.string().optional(),
  category: z.string(),
});

export type TimelineStep = z.infer<typeof TimelineStepSchema>;

export const MythCheckSchema = z.object({
  claim: z.string(),
  context: z.string().optional(),
});

export type MythCheck = z.infer<typeof MythCheckSchema>;

export const VerificationResultSchema = z.object({
  classification: z.enum(['VERIFIED', 'UNVERIFIED', 'MISLEADING', 'FALSE']),
  explanation: z.string(),
  source: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;
