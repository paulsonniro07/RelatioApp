import { resolveApiPhotoUrl } from '@/lib/api';

interface NodeAvatarProps {
  /** Full name — used to derive the initials when there is no photo. */
  name: string;
  /** Circle background colour. */
  background: string;
  /** Initials colour. */
  foreground: string;
  /**
   * Optional uploaded/remote photo. When present the photo is shown inside the
   * avatar circle; otherwise a colored-initials circle is rendered.
   */
  photoUrl?: string | null;
}

function toInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * The single node-avatar renderer for the whole tree (canvas + export).
 *
 * Photo avatars are now an intentional feature: pass `photoUrl` to show the
 * person's uploaded photo in the circular avatar. Without a photo (or while one
 * is loading/removed) the colored-initials circle is the fallback — both states
 * share the same 44px circle so cards never mix sizes.
 */
export function NodeAvatar({ name, background, foreground, photoUrl }: NodeAvatarProps) {
  const photoSrc = resolveApiPhotoUrl(photoUrl ?? null);

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt=""
        className="h-11 w-11 shrink-0 rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${background}` }}
      />
    );
  }

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{ backgroundColor: background, color: foreground }}
      aria-hidden="true"
    >
      {toInitials(name)}
    </span>
  );
}

