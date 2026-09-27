/** SAATRAAI public landing page. */

import { LandingFooter, LandingHeader } from '@/components/landing/chrome';
import { LandingHero } from '@/components/landing/hero';
import {
  ContradictionSection,
  GraphSection,
  HowItWorks,
  ModalitiesSection,
  PipelineSection,
  ReasoningSection,
  TechnologySection,
  TemporalSection,
  UncertaintySection,
  UseCasesSection,
} from '@/components/landing/sections';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void">
      <LandingHeader />
      <LandingHero />
      <HowItWorks />
      <PipelineSection />
      <ModalitiesSection />
      <ReasoningSection />
      <GraphSection />
      <TemporalSection />
      <ContradictionSection />
      <UncertaintySection />
      <UseCasesSection />
      <TechnologySection />
      <LandingFooter />
    </div>
  );
}
