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
import { JsonLd } from '@/components/content/JsonLd';
import { pageMeta } from '@/lib/seo/meta';
import { HOME_SEO } from '@/lib/seo/pages';
import { graph, ids, mobileAppNode, siteNodes, webPageNode } from '@/lib/seo/schema';

export const metadata = pageMeta('/');

export default function HomePage() {
  return (
    <main id="main-content">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', '/', HOME_SEO.title, HOME_SEO.description, { about: { '@id': ids.app } }, false),
          mobileAppNode(),
        )}
      />
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
