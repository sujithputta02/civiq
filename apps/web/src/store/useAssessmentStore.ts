import { create } from 'zustand';
import { type ReadinessAssessment, type TimelineStep } from '@civiq/types';

interface AssessmentState {
  data: Partial<ReadinessAssessment>;
  timeline: TimelineStep[];
  step: number;
  setStep: (step: number) => void;
  updateData: (data: Partial<ReadinessAssessment>) => void;
  setTimeline: (timeline: TimelineStep[]) => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  data: {},
  timeline: [],
  step: 0,
  setStep: (step) => set({ step }),
  updateData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
  setTimeline: (timeline) => set({ timeline }),
  reset: () => set({ data: {}, timeline: [], step: 0 }),
}));
