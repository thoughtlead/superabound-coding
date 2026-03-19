"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    hbspt?: {
      forms: {
        create: (options: Record<string, unknown>) => void;
      };
    };
  }
}

type HubspotFormEmbedProps = {
  formId: string;
  portalId: string;
  region?: string;
};

export function HubspotFormEmbed({
  formId,
  portalId,
  region = "na1",
}: HubspotFormEmbedProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const targetId = useMemo(
    () => `hubspot-form-${formId.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
    [formId],
  );

  useEffect(() => {
    if (!scriptReady || !window.hbspt?.forms) {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target || target.dataset.loaded === "true") {
      return;
    }

    target.innerHTML = "";

    window.hbspt.forms.create({
      region,
      portalId,
      formId,
      target: `#${targetId}`,
    });

    target.dataset.loaded = "true";
  }, [formId, portalId, region, scriptReady, targetId]);

  return (
    <>
      <Script
        src="https://js.hsforms.net/forms/embed/v2.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="hubspot-form-shell">
        <div id={targetId} className="hubspot-form-target" />
      </div>
    </>
  );
}
