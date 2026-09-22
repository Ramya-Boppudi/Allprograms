import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { assetUrl } from '../config/apiBase';

const BrandingContext = createContext({
  boardLogoUrl: null,
  stateEmblemUrl: null,
  loaded: false,
});

export function BrandingProvider({ children }) {
  const [logos, setLogos] = useState({ boardLogoUrl: null, stateEmblemUrl: null, loaded: false });

  useEffect(() => {
    let cancelled = false;
    api.get('/masters/branding')
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.data?.logos || [];
        const byCode = Object.fromEntries(list.map((logo) => [logo.code, logo.url]));
        setLogos({
          boardLogoUrl: byCode.board_logo ? assetUrl(byCode.board_logo) : null,
          stateEmblemUrl: byCode.state_emblem ? assetUrl(byCode.state_emblem) : null,
          loaded: true,
        });
      })
      .catch(() => {
        if (!cancelled) setLogos((prev) => ({ ...prev, loaded: true }));
      });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => logos, [logos]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
