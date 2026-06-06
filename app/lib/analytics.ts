"use client";

type AnalyticsPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    posthog?: {
      init: (
        key: string,
        options: {
          api_host: string;
          capture_pageview?: boolean;
        },
      ) => void;
      capture: (eventName: string, properties?: AnalyticsPayload) => void;
    };
  }
}

let posthogStarted = false;

export function initAnalytics() {
  if (posthogStarted || typeof window === "undefined") {
    return;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return;
  }

  posthogStarted = true;

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-posthog="true"]',
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.posthog = "true";
    script.src = "https://app.posthog.com/static/array.js";
    script.onload = () => startPostHog(key);
    document.head.appendChild(script);
    return;
  }

  startPostHog(key);
}

export function trackEvent(
  eventName: "simulator_completed" | "cta_clicked",
  properties?: AnalyticsPayload,
) {
  if (typeof window === "undefined" || !window.posthog) {
    return;
  }

  window.posthog.capture(eventName, properties);
}

function startPostHog(key: string) {
  if (!window.posthog) {
    return;
  }

  window.posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: true,
  });
}
