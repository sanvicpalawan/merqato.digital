import { useEffect, useState } from "react";
import { getCloudAssetUrl } from "@/lib/site-cloud";

const ASSET_DB = "merqato-backoffice-assets";
const ASSET_STORE = "files";

function openAssetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ASSET_STORE))
        request.result.createObjectStore(ASSET_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLocalAssetUrl(id: string) {
  const db = await openAssetDb();
  return new Promise<string | undefined>((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readonly");
    const request = transaction.objectStore(ASSET_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.file ? URL.createObjectURL(request.result.file as Blob) : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Resolves a mixed list of asset references (cloud `remote:` paths and older
 * browser-library ids) into displayable URLs.
 */
export function useResolvedAssets(ids: string[]) {
  const key = ids.filter(Boolean).join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const list = key ? key.split("|") : [];
    let live = true;
    const created: string[] = [];

    Promise.all(
      list.map(async (id) => ({
        id,
        url: id.startsWith("remote:") ? getCloudAssetUrl(id) : await getLocalAssetUrl(id),
      })),
    )
      .then((items) => {
        const next: Record<string, string> = {};
        items.forEach(({ id, url }) => {
          if (!url) return;
          next[id] = url;
          if (!id.startsWith("remote:")) created.push(url);
        });
        if (!live) {
          created.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setUrls(next);
      })
      .catch(() => setUrls({}));

    return () => {
      live = false;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [key]);

  return urls;
}
