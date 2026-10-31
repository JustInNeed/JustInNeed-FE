"use client";

import { useMemo } from "react";
import { SettingsView } from "@/features/settings/SettingsView";
import { toExcludedUrl } from "@/features/settings/excludedUrl";
import { getExcludedUrls, getExtensionSettings } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";

export default function SettingsPage() {
  const urls = useApi(getExcludedUrls);
  const extension = useApi(getExtensionSettings);
  const excludedUrls = useMemo(() => (urls.data?.excludedUrls ?? []).map(toExcludedUrl), [urls.data]);

  return (
    <SettingsView
      excludedUrls={excludedUrls}
      loading={urls.loading}
      error={urls.error}
      onRetry={urls.refetch}
      extension={extension.data ?? undefined}
      extensionLoading={extension.loading}
      extensionError={extension.error}
      onRetryExtension={extension.refetch}
    />
  );
}
