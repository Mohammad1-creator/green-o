"use client";

import { CameraIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { prepareImage } from "@/lib/images/compress";
import { createClient } from "@/lib/supabase/browser";

import { registerPhotoAction } from "./actions";

/**
 * Takes or picks a photo, shrinks it, uploads it to the private bucket
 * under <folder>/<ownerId>/ with the user's session, then records it.
 */
export function PhotoUploader({
  folder,
  ownerId,
}: {
  folder: "tasks" | "faults";
  ownerId: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const image = await prepareImage(file);
      if (!image) {
        toast.error("صيغة الصورة غير مدعومة. استخدم JPEG أو PNG.");
        return;
      }
      const path = `${folder}/${ownerId}/${crypto.randomUUID()}.${image.extension}`;
      const { error } = await createClient()
        .storage.from("attachments")
        .upload(path, image.blob, {
          contentType: image.mimeType,
          upsert: false,
        });
      if (error) {
        toast.error("تعذّر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى.");
        return;
      }
      const result = await registerPhotoAction({
        folder,
        ownerId,
        path,
        mimeType: image.mimeType,
        size: image.blob.size,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("أُرفقت الصورة");
      router.refresh();
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        id={`photo-${ownerId}`}
        aria-label="اختيار صورة"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Spinner /> : <CameraIcon />}
        {busy ? "جارٍ رفع الصورة…" : "إرفاق صورة"}
      </Button>
    </div>
  );
}
