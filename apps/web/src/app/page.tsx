import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { WhyRaqm } from '@/components/WhyRaqm';
import { FeatureBentoGrid } from '@/components/FeatureBentoGrid';
import { FlagshipStrip } from '@/components/FlagshipStrip';
import { WaitlistSection } from '@/components/WaitlistSection';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <WhyRaqm />
        <FeatureBentoGrid />
        <FlagshipStrip />
        <WaitlistSection />
      </main>
      <Footer />
    </>
  );
}
