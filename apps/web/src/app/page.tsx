import { SiteHeader } from '@/components/SiteHeader';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { WhyRaqm } from '@/components/WhyRaqm';
import { FeatureBentoGrid } from '@/components/FeatureBentoGrid';
import { FlagshipStripVertical } from '@/components/FlagshipStripVertical';
import { WaitlistSection } from '@/components/WaitlistSection';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <WhyRaqm />
        <FeatureBentoGrid />
        <FlagshipStripVertical />
        <WaitlistSection />
      </main>
      <Footer />
    </>
  );
}
