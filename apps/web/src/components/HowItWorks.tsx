import { HowItWorksPhone } from './HowItWorksPhone';
import { PHONE_OVERLAP } from './heroPeek';

export function HowItWorks() {
  return (
    <div id="how-it-works" className={`pointer-events-none relative z-20 motion-reduce:mt-0 ${PHONE_OVERLAP}`}>
      <HowItWorksPhone />
    </div>
  );
}
