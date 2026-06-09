"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeView({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      margin: 2,
      width: 280,
      color: { dark: "#211B4E", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    })
      .then((d) => !cancelled && setDataUrl(d))
      .catch((e) => !cancelled && setError(e.message ?? "Couldn't render the QR code."));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          width={280}
          height={280}
          alt={`QR code for ${url}`}
          className="rounded-2xl bg-white p-3"
        />
      ) : (
        <div className="h-[280px] w-[280px] animate-pulse rounded-2xl bg-bar-track" />
      )}
      <p className="font-mono text-xs text-ink-soft">Scan to vote</p>
    </div>
  );
}
