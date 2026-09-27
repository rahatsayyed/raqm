export function BackgroundDepth() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-1/4 -top-1/3 h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-primary)_16%,transparent)_0%,color-mix(in_srgb,var(--color-accent-primary)_5%,transparent)_40%,transparent_70%)] blur-[100px]" />
      <div className="absolute -right-1/3 -top-1/4 h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-notice)_11%,transparent)_0%,color-mix(in_srgb,var(--color-notice)_3%,transparent)_40%,transparent_70%)] blur-[100px]" />
      <div className="absolute bottom-[-10%] left-1/3 h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-deep)_55%,transparent)_0%,color-mix(in_srgb,var(--color-accent-deep)_20%,transparent)_40%,transparent_70%)] blur-[100px]" />
    </div>
  );
}
