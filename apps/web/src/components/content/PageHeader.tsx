import { Rise } from './Rise';

export function PageHeader({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <Rise as="header" className="mx-auto max-w-col px-6 pt-40 pb-10 text-center md:pt-44">
      <p className="text-sm font-medium text-ink-subtle">{eyebrow}</p>
      <h1 className="mt-3 text-h1 text-balance">{title}</h1>
      {sub && <p className="mx-auto mt-4 max-w-xl text-lead text-ink-muted">{sub}</p>}
      {children}
    </Rise>
  );
}
