import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DocumentData, DocumentSnapshot, Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function capitalize(s: string) {
  if (typeof s !== 'string' || s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formats a content type string (e.g., 'tv-show') into a human-readable format ('TV Show').
 * @param type The content type string.
 * @returns A formatted, capitalized string.
 */
export function formatContentType(type: string): string {
  if (!type) return 'Unknown';
  switch (type) {
    case 'tv-show':
      return 'TV Show';
    default:
      return capitalize(type.replace('-', ' '));
  }
}

/**
 * Safely converts a Firestore document snapshot into a plain JavaScript object.
 * It also handles the conversion of Firestore Timestamps into ISO 8601 date strings.
 * @param doc The Firestore document snapshot.
 * @returns A plain object with the document's data and its ID.
 */
export function documentToPlainObject(doc: DocumentSnapshot<DocumentData>): object {
  if (!doc.exists()) {
    return { id: doc.id };
  }
  const data = doc.data();

  const plainData: { [key: string]: any } = { id: doc.id };

  for (const key in data) {
    const value = data[key];
    if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
      plainData[key] = (value as Timestamp).toDate().toISOString();
    } else {
      plainData[key] = value;
    }
  }
  return plainData;
}


/**
 * Checks if the browser supports HEVC (H.265) playback via the MediaSource API.
 * @returns {boolean} True if HEVC is likely supported, false otherwise.
 */
export function isHevcSupported(): boolean {
  if (typeof window === 'undefined' || !('MediaSource' in window) || !MediaSource.isTypeSupported) {
    return false;
  }
  // Common HEVC codec strings
  const hevcCodecs = [
    'video/mp4; codecs="hvc1"',
    'video/mp4; codecs="hev1"',
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
  ];
  return hevcCodecs.some(codec => MediaSource.isTypeSupported(codec));
}

export const isUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}
