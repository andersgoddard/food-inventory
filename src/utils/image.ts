import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Keeps upload payloads small and predictable for the AI gateway, regardless of native camera resolution.
const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_JPEG_COMPRESSION = 0.7;

export interface ResizableImage {
  uri: string;
  width: number;
  height: number;
}

export interface ResizeImageOptions {
  maxDimension?: number;
  compress?: number;
}

export async function resizeImageForUpload<T extends ResizableImage>(
  asset: T,
  options: ResizeImageOptions = {}
): Promise<T> {
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const compress = options.compress ?? DEFAULT_JPEG_COMPRESSION;

  if (asset.width <= maxDimension && asset.height <= maxDimension) {
    return asset;
  }

  try {
    const longestSide = Math.max(asset.width, asset.height);
    const scale = maxDimension / longestSide;
    const result = await manipulateAsync(
      asset.uri,
      [{ resize: { width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) } }],
      { compress, format: SaveFormat.JPEG }
    );
    return { ...asset, uri: result.uri, width: result.width, height: result.height };
  } catch (error) {
    console.warn('[image] resize failed, using original photo', { error });
    return asset;
  }
}
