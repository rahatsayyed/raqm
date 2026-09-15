// pdfjs-dist ships the worker as a plain .mjs file with no bundled declaration. Only the one
// export gpayPdf.ts needs (WorkerMessageHandler, registered as the main-thread fake worker) is
// declared here — see gpayPdf.ts for why this registration exists.
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
