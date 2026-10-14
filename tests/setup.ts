// Vitest setup for browser extension environment
import { vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const storageStore: Record<string, any> = {};

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys: any) => {
        return new Promise((resolve) => {
          if (keys === null || keys === undefined) {
            resolve({ ...storageStore });
          } else if (typeof keys === 'string') {
            resolve({ [keys]: storageStore[keys] });
          } else if (Array.isArray(keys)) {
            const res: Record<string, any> = {};
            for (const k of keys) {
              res[k] = storageStore[k];
            }
            resolve(res);
          } else if (typeof keys === 'object') {
            const res: Record<string, any> = { ...keys };
            for (const k of Object.keys(keys)) {
              if (storageStore[k] !== undefined) {
                res[k] = storageStore[k];
              }
            }
            resolve(res);
          } else {
            resolve({});
          }
        });
      }),
      set: vi.fn((items: Record<string, any>) => {
        return new Promise<void>((resolve) => {
          Object.assign(storageStore, items);
          resolve();
        });
      }),
      remove: vi.fn((keys: string | string[]) => {
        return new Promise<void>((resolve) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          for (const k of arr) {
            delete storageStore[k];
          }
          resolve();
        });
      }),
      clear: vi.fn(() => {
        return new Promise<void>((resolve) => {
          for (const k of Object.keys(storageStore)) {
            delete storageStore[k];
          }
          resolve();
        });
      }),
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
    getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
    sendMessage: vi.fn(() => Promise.resolve()),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
    },
    openOptionsPage: vi.fn(),
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://www.youtube.com/' }])),
    sendMessage: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve()),
  },
  action: {
    setBadgeText: vi.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
  },
};

(globalThis as any).chrome = chromeMock;
