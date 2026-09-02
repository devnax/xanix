declare global {
  const __XANIX_CLIENT_RUNTIME_FILE_NAME__: string;
  const __XANIX_CLIENT__: boolean;
  const __XANIX_SERVER__: boolean;
  const __XANIX_DEV__: boolean;
  const __XANIX_PROD__: boolean;

  // XANIX Data
  const XANIXDT: {
    handlers: Record<string, () => Promise<any>>;
    pages: Record<string, string[]>;
    initialed: Record<string, boolean>;
  };

  // navigation events
  const XANIX_NAVIGATE: string;
  const XANIX_NAVIGATE_START: string;
  const XANIX_NAVIGATE_END: string;
  const XANIX_PRELOAD: string;
  const XANIX_PRELOAD_START: string;
  const XANIX_PRELOAD_END: string;

  const XANIX_NAVIGATE_RELOAD: string;
}

export {};
