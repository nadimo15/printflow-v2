import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SiteConfig } from '../types/siteConfig';

import { defaultSiteConfig as DEFAULT_CONFIG } from '../config/defaultSiteConfig';

// Deep merge: db config keys override defaults, missing keys fall back to defaults
function deepMerge(defaults: any, override: any): any {
    if (!override || typeof override !== 'object') return defaults;
    const result = { ...defaults };
    for (const key of Object.keys(override)) {
        if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
            result[key] = deepMerge(defaults[key] || {}, override[key]);
        } else if (override[key] !== null && override[key] !== undefined && override[key] !== '') {
            result[key] = override[key];
        }
    }
    return result;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSiteConfig() {
    const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        // Detect ?preview=true
        const params = new URLSearchParams(window.location.search);
        const isPreview = params.get('preview') === 'true';

        (async () => {
            try {
                const response = await api.siteConfig.get();
                if (!cancelled && response.success && response.data) {
                    const rawData = isPreview ? response.data.draft_data : response.data.published_data;
                    setConfig(deepMerge(DEFAULT_CONFIG, rawData) as SiteConfig);
                }
            } catch (err) {
                console.warn('Failed to fetch site config, falling back to defaults', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Also expose a raw `isPreview` boolean so UI can flag it
    const isPreviewMode = new URLSearchParams(window.location.search).get('preview') === 'true';

    return { config, loading, isPreviewMode };
}
