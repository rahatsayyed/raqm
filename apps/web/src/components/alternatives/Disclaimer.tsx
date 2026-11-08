import { formatVerified } from './format';

export function Disclaimer({ name, verifiedOn }: { name: string; verifiedOn: string }) {
  return (
    <aside aria-label="Disclaimer" className="rounded-cell bg-surface-sunken p-5 text-sm leading-relaxed text-ink-muted">
      <p>
        Raqm is not affiliated with, endorsed by or sponsored by {name}. {name} is a trademark of its owner and is used here only to identify the app being compared. Facts come from public
        sources linked above and were checked on {formatVerified(verifiedOn)}; they may have changed. A dash means not confirmed in the public listing. Spot something out of date? Tell us and we will fix it.
      </p>
      {/* TODO: link a public corrections email here once one exists in src/content/site.ts */}
    </aside>
  );
}
