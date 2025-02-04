export function createAbortSignal() {
  const abortController = new AbortController();
  const { signal: signalAbort } = abortController;
  const handleAbort = () => {
    abortController.abort();
    process.off('SIGINT', handleAbort);
  };
  process.on('SIGINT', handleAbort);
  return signalAbort;
}
