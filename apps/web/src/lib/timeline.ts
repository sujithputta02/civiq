import { type ReadinessAssessment, type TimelineStep } from '@civiq/types';

export function generateTimeline(assessment: Partial<ReadinessAssessment>): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // 1. Registration Step
  if (assessment.votingStatus === 'NOT_REGISTERED' || assessment.votingStatus === 'UNSURE') {
    steps.push({
      id: 'reg-01',
      title: 'Register to Vote',
      description: 'The first and most critical step. Check eligibility and submit your registration form.',
      status: 'URGENT',
      category: 'Registration',
      deadline: 'Varies by state (usually 15-30 days before)',
    });
  } else {
    steps.push({
      id: 'reg-01',
      title: 'Verify Registration',
      description: 'Even if registered, verify your status on the voter roll to avoid polling day surprises.',
      status: 'COMPLETED',
      category: 'Registration',
    });
  }

  // 2. ID Requirements
  steps.push({
    id: 'id-01',
    title: 'Check ID Requirements',
    description: 'Find out which documents are accepted in your area. Avoid "Document Risk".',
    status: assessment.familiarity && assessment.familiarity < 3 ? 'NEXT' : 'VERIFY',
    category: 'Documents',
  });

  // 3. Voting Method
  if (assessment.constraints?.includes('Busy schedule') || assessment.constraints?.includes('Living abroad')) {
    steps.push({
      id: 'meth-01',
      title: 'Request Absentee Ballot',
      description: 'Since you have schedule constraints, mail-in voting is recommended.',
      status: 'NEXT',
      category: 'Method',
    });
  } else {
    steps.push({
      id: 'meth-01',
      title: 'Locate Polling Place',
      description: 'Find your assigned polling station and check opening hours.',
      status: 'LATER',
      category: 'Method',
    });
  }

  // 4. Misinformation Shield
  if (assessment.confidence && assessment.confidence < 3) {
    steps.push({
      id: 'mis-01',
      title: 'Complete Myth-Check Lab',
      description: 'Reduce misinformation risk by learning how to spot common election falsehoods.',
      status: 'NEXT',
      category: 'Trust',
    });
  }

  // 5. Polling Day Experience
  steps.push({
    id: 'sim-01',
    title: 'Mock Voting Simulation',
    description: 'Walk through a digital rehearsal of what happens at the polling station.',
    status: 'LATER',
    category: 'Simulation',
  });

  return steps;
}
