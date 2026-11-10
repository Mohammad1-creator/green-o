import type { ReactNode } from "react";

import { formatDateTime } from "@/lib/format";

import type { Photo } from "./queries";

/** Thumbnails that open the full photo; an optional control per photo. */
export function PhotoGrid({
  photos,
  timeZone,
  label,
  renderAction,
}: {
  photos: Photo[];
  timeZone: string;
  label: string;
  renderAction?: (photo: Photo) => ReactNode;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">لا توجد صور.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={label}>
      {photos.map((photo) => (
        <li key={photo.id} className="space-y-1">
          {photo.url ? (
            <a
              href={photo.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {/* Signed links change on every visit, so next/image adds nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`صورة أرفقها ${photo.uploader?.full_name ?? ""}`}
                className="aspect-square w-full rounded-lg border object-cover"
                loading="lazy"
              />
            </a>
          ) : null}
          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
            <span className="truncate">
              {photo.uploader?.full_name} ·{" "}
              {formatDateTime(photo.created_at, timeZone)}
            </span>
            {renderAction ? renderAction(photo) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
