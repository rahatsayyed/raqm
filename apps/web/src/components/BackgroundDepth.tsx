export function BackgroundDepth() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-1/4 -top-1/3 h-[65vw] w-[65vw] rounded-full bg-[radial-gradient(circle,rgba(46,93,78,0.16)_0%,rgba(46,93,78,0.05)_40%,transparent_70%)] blur-[100px]" />
      <div className="absolute -right-1/3 -top-1/4 h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(184,129,60,0.11)_0%,rgba(184,129,60,0.03)_40%,transparent_70%)] blur-[100px]" />
      <div className="absolute bottom-[-10%] left-1/3 h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,rgba(220,233,227,0.55)_0%,rgba(220,233,227,0.2)_40%,transparent_70%)] blur-[100px]" />
    </div>
  );
}
