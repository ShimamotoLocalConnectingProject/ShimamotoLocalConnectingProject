import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Clock, X } from "lucide-react";

interface RewardQRDisplayProps {
  qrPayload: string;
  storeName: string;
  expiresIn: number; // seconds
  onClose: () => void;
}

export default function RewardQRDisplay({
  qrPayload,
  storeName,
  expiresIn,
  onClose,
}: RewardQRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(expiresIn);

  // Draw QR code
  useEffect(() => {
    const draw = async () => {
      if (!canvasRef.current) return;
      const QRCode = (await import("qrcode")).default;
      await QRCode.toCanvas(canvasRef.current, qrPayload, {
        width: 300,
        margin: 2,
        color: { dark: "#2C2018", light: "#FFF8F0" },
      });
    };
    draw();
  }, [qrPayload]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-warm-50 border-2 border-gold-500 p-6 max-w-sm w-full relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-warm-900">特典使用</h2>
          <p className="text-warm-700">{storeName}</p>

          {!isExpired ? (
            <>
              <div className="bg-white p-4 rounded-xl inline-block">
                <canvas ref={canvasRef} />
              </div>

              <div className="flex items-center justify-center gap-2 text-gold-600">
                <Clock className="w-5 h-5" />
                <span className="text-xl font-mono font-bold">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>

              <p className="text-sm text-warm-600">
                このQRコードを店舗スタッフに提示してください
              </p>
            </>
          ) : (
            <div className="py-8">
              <p className="text-red-600 font-bold text-lg">有効期限切れ</p>
              <p className="text-sm text-warm-600 mt-2">
                もう一度特典使用ボタンを押してください
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
