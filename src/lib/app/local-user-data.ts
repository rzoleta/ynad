const LOCAL_STORAGE_PREFIX = 'ynad.';
const SESSION_STORAGE_PREFIX = 'ynad.';
const MODE_WATCHER_KEYS = ['mode-watcher-mode', 'mode-watcher-theme'];

export function clearLocalUserData(): void {
  removeStorageKeys(localStorage, (key) => key.startsWith(LOCAL_STORAGE_PREFIX));
  removeStorageKeys(sessionStorage, (key) => key.startsWith(SESSION_STORAGE_PREFIX));

  for (const key of MODE_WATCHER_KEYS) {
    localStorage.removeItem(key);
  }
}

function removeStorageKeys(storage: Storage, shouldRemove: (key: string) => boolean): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => Boolean(key)
  );

  for (const key of keys) {
    if (shouldRemove(key)) storage.removeItem(key);
  }
}
