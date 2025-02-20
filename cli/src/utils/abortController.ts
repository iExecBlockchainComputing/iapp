export function createSigintAbortSignal() {
  const abortController = new AbortController();
  function clearListener() {
    process.off('SIGINT', handleAbort);
  }
  function handleAbort() {
    abortController.abort();
    clearListener();
  }
  process.on('SIGINT', handleAbort);
  return {
    /**
     * AbortSignal trigged by SIGINT
     */
    signal: abortController.signal,
    /**
     * clear the SIGINT listener
     */
    clear: clearListener,
  };
}
