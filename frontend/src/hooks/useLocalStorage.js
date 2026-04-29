import { useEffect, useState } from "react";

function resolveStorage(storageType) {
  return storageType === "session" ? window.sessionStorage : window.localStorage;
}

export function useLocalStorage(key, initialValue, storageType = "local") {
  const [value, setValue] = useState(() => {
    const storage = resolveStorage(storageType);
    const storedValue = storage.getItem(key);
    if (storedValue === null) {
      return initialValue;
    }

    try {
      return JSON.parse(storedValue);
    } catch {
      return storedValue;
    }
  });

  useEffect(() => {
    const storage = resolveStorage(storageType);
    storage.setItem(key, JSON.stringify(value));
  }, [key, storageType, value]);

  return [value, setValue];
}
