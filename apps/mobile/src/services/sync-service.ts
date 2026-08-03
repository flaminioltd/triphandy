import { db } from '../db/client';
import { contentCache } from '../db/schema';
import { eq } from 'drizzle-orm';
import Constants from 'expo-constants';

// We use a fallback URL or load from Expo config
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://content-api.triphandy.com/api/v1';

export interface PackageManifest {
  version: string;
  hash: string;
}

export interface ManifestResponse {
  packages: Record<string, PackageManifest>;
}

export class SyncService {
  async syncContentPackages(): Promise<void> {
    try {
      console.log('Starting content sync...');
      // 1. Fetch remote manifest
      const manifestRes = await fetch(`${API_BASE_URL}/manifest`);
      if (!manifestRes.ok) throw new Error(`Failed to fetch manifest: ${manifestRes.statusText}`);
      
      const manifest: ManifestResponse = await manifestRes.json();
      
      // 2. Fetch local cache state
      const localPackages = await db.select().from(contentCache);
      const localMap = new Map(localPackages.map(pkg => [pkg.packageName, pkg]));
      
      // 3. Compare and fetch missing/updated packages
      for (const [pkgName, pkgMeta] of Object.entries(manifest.packages)) {
        const localPkg = localMap.get(pkgName);
        
        if (!localPkg || localPkg.hash !== pkgMeta.hash) {
          console.log(`Update required for ${pkgName}. Fetching from API...`);
          const pkgRes = await fetch(`${API_BASE_URL}/packages/${pkgName}`);
          
          if (!pkgRes.ok) {
            console.warn(`Failed to fetch package ${pkgName}: ${pkgRes.statusText}`);
            continue;
          }
          
          const contentText = await pkgRes.text();
          
          if (localPkg) {
            // Update existing cache entry
            await db.update(contentCache)
              .set({
                version: pkgMeta.version,
                hash: pkgMeta.hash,
                content: contentText,
                updatedAt: new Date(),
              })
              .where(eq(contentCache.packageName, pkgName));
          } else {
            // Insert new cache entry
            await db.insert(contentCache).values({
              packageName: pkgName,
              version: pkgMeta.version,
              hash: pkgMeta.hash,
              content: contentText,
              updatedAt: new Date(),
            });
          }
          console.log(`Successfully synced package: ${pkgName}`);
        }
      }
      
      console.log('Content packages sync complete.');
    } catch (error) {
      console.error('Content sync failed:', error);
      throw error;
    }
  }

  async getPackageContent<T>(packageName: string): Promise<T | null> {
    const result = await db.select()
      .from(contentCache)
      .where(eq(contentCache.packageName, packageName))
      .limit(1);
      
    if (result.length > 0) {
      try {
        return JSON.parse(result[0].content) as T;
      } catch (e) {
        console.error(`Failed to parse cached package ${packageName}`, e);
        return null;
      }
    }
    return null;
  }
}

export const syncService = new SyncService();
