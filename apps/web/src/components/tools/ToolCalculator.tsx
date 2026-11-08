import type { ToolSlug } from '@/lib/calculators/tools';
import { CompoundCalculator, EmiCalculator, SipCalculator } from './GrowthCalculators';
import { BudgetCalculator, EmergencyCalculator } from './PlanningCalculators';
import { SplitBillCalculator } from './SplitBillCalculator';

export function ToolCalculator({ slug }: { slug: ToolSlug }) {
  switch (slug) {
    case 'emi':
      return <EmiCalculator />;
    case 'sip':
      return <SipCalculator />;
    case 'compound-interest':
      return <CompoundCalculator />;
    case 'split-bill':
      return <SplitBillCalculator />;
    case 'emergency-fund':
      return <EmergencyCalculator />;
    case 'budget-50-30-20':
      return <BudgetCalculator />;
  }
}
