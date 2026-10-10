import { useEffect, useState } from 'react';
import { getFileContent, type FileContent } from '@/services/assetService';
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/sessionSlice';
import type { Asset, AssetFile } from '@/types';
import { svgToDataUrl } from '@/lib/svgThumbnail';

export interface LoadedFile {
  loading: boolean;
  content?: FileContent;
  /** Object or data URL for media elements. */
  url?: string;
}

/** Loads a file's content through the asset service, so access is checked like any other read. */
export function useFileContent(asset: Asset | undefined, file: AssetFile | undefined): LoadedFile {
  const user = useAppSelector(selectCurrentUser);
  const [state, setState] = useState<LoadedFile>({ loading: true });

  useEffect(() => {
    if (!asset || !file || !user) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    let objectUrl: string | undefined;
    setState({ loading: true });
    getFileContent(user, asset.id, file.id)
      .then((content) => {
        if (cancelled) return;
        let url: string | undefined;
        if (content.kind === 'blob' && content.blob) url = objectUrl = URL.createObjectURL(content.blob);
        if (content.kind === 'svg' && content.text) url = svgToDataUrl(content.text);
        if (content.kind === 'text' && content.text && file.mime === 'text/vtt') {
          url = objectUrl = URL.createObjectURL(new Blob([content.text], { type: 'text/vtt' }));
        }
        setState({ loading: false, content, url });
      })
      .catch(() => !cancelled && setState({ loading: false }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset, file, user]);

  return state;
}
