declare global {
  const __XANIX_PAGE_NAVIGATION_HEADER_VALUE__: string;
  const __XANIX_CLIENT__: boolean;
  const __XANIX_SERVER__: boolean;
  const __XANIX_DEV__: boolean;
  const __XANIX_PROD__: boolean;

  // navigation events
  const XANIX_NAVIGATE: string;
  const XANIX_NAVIGATE_START: string;
  const XANIX_NAVIGATE_END: string;
  const XANIX_PRELOAD: string;
  const XANIX_PRELOAD_START: string;
  const XANIX_PRELOAD_END: string;
  const XANIX_NAVIGATE_RELOAD: string;

  interface Window {
    __XANIX_DATA__: Record<string, any>;
  }
}
const props = window.__XANIX_DATA__;

export {};
