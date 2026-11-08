import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { DesktopMobileShowcase } from '@/components/sections/DesktopMobileShowcase';
import { FeatureCurtain } from '@/components/sections/FeatureCurtain';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { AppTabsShowcase } from '@/components/sections/AppTabsShowcase';
import { FeatureCells } from '@/components/sections/FeatureCells';
import { BillSection } from '@/components/sections/BillSection';
import { ComparisonSection } from '@/components/sections/ComparisonCard';
import { FaqSection } from '@/components/sections/FaqAccordion';
import { WaitlistSection } from '@/components/WaitlistSection';

export default function HomePage() {
  return (
    <main id="main-content">
      <Hero />
      <HowItWorks />
      <DesktopMobileShowcase />
      <FeatureCurtain />
      <ProcessSteps />
      <AppTabsShowcase />
      <FeatureCells />
      <BillSection />
      <ComparisonSection />
      <WaitlistSection />
      <FaqSection />
    </main>
  );
}
