import { useCallback, useRef, useState } from "react";

export function useMessageHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const draftRef = useRef("");

  const pushMessage = useCallback((message: string) => {
    setHistory((prev) => {
      if (prev[prev.length - 1] === message) return prev;
      return [...prev, message];
    });
    setHistoryIndex(-1);
    draftRef.current = "";
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    draftRef.current = "";
  }, []);

  const onInputChange = useCallback((value: string, setInput: (value: string) => void) => {
    setHistoryIndex(-1);
    setInput(value);
  }, []);

  const handleHistoryKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLTextAreaElement>,
      input: string,
      setInput: (value: string) => void
    ) => {
      if (event.key === "ArrowUp") {
        if (history.length === 0) return;
        event.preventDefault();

        if (historyIndex === -1) {
          draftRef.current = input;
          const nextIndex = history.length - 1;
          setHistoryIndex(nextIndex);
          setInput(history[nextIndex]);
          return;
        }

        if (historyIndex > 0) {
          const nextIndex = historyIndex - 1;
          setHistoryIndex(nextIndex);
          setInput(history[nextIndex]);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        if (historyIndex === -1) return;
        event.preventDefault();

        if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          setHistoryIndex(nextIndex);
          setInput(history[nextIndex]);
          return;
        }

        setHistoryIndex(-1);
        setInput(draftRef.current);
      }
    },
    [history, historyIndex]
  );

  return { pushMessage, clearHistory, onInputChange, handleHistoryKeyDown };
};
