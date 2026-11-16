declare global {
  interface Window {
    /**
     * Navigate to the auth page with a custom redirect URL
     * @param redirectUrl - URL to redirect to after successful authentication
     */
    navigateToAuth: (redirectUrl: string) => void;

    /**
     * Optional Plausible analytics function, injected only when the site
     * explicitly loads Plausible. Calls are guarded with `?.`.
     */
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number> },
    ) => void;
  }
}

export {};