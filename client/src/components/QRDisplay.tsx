import { useEffect, useRef } from "react";

interface QRDisplayProps {
  payload: string;
  storeName: string;
}

export default function QRDisplay({ payload, storeName }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = async () => {
      if (!canvasRef.current) return;
      const QRCode = (await import("qrcode")).default;
      await QRCode.toCanvas(canvasRef.current, payload, {
        width: 200,
        margin: 2,
        color: { dark: "#2C2018", light: "#FFF8F0" },
      });
    };
    draw();
  }, [payload]);

  return (
    <div className="text-center p-4">
      <canvas
        ref={canvasRef}
        className="rounded-xl border-2 border-gold-500/30 mx-auto"
      />
      <div className="text-xs text-warm-500 mt-2">
        本日のQRコード（毎日自動更新）
      </div>
      <div className="text-sm font-bold text-warm-900 mt-1">{storeName}</div>
    </div>
  );
}
