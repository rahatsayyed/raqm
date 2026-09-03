// react-native ships `ErrorUtils` as a module-scoped type export (see
// node_modules/react-native/types/Libraries/vendor/core/ErrorUtils.d.ts) but does not declare
// the runtime-injected global identifier `ErrorUtils` itself — it's only reachable as a bare
// global at runtime (see Libraries/Core/setUpErrorHandling.js), not importable. This ambient
// declaration makes the bare identifier usable from TypeScript without an import.
declare const ErrorUtils: {
  setGlobalHandler: (callback: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
} | undefined;
