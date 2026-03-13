import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    let scanner: any;
    const init = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (!hasScanned.current) {
              hasScanned.current = true;
              onScan(decodedText);
            }
          },
          () => {}
        );
      } catch (e) {
        console.error("Camera error:", e);
      }
    };
    init();
    return () => {
      if (scannerRef.current) {
        // Check if scanner is actually running before stopping
        const state = scannerRef.current.getState();
        if (state === 2) {
          // State 2 = SCANNING
          scannerRef.current.stop().catch((err: any) => {
            console.log("Scanner already stopped:", err);
          });
        }
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-warm-900/95 backdrop-blur-sm">
      <div className="text-gold-500 text-sm mb-4 tracking-widest font-medium">
        QRコードをスキャン
      </div>
      <div
        id="qr-reader"
        className="w-[300px] h-[300px] rounded-2xl overflow-hidden border-2 border-gold-500"
      />
      <div className="text-warm-400 text-xs mt-4 text-center">
        店頭のQRコードにカメラを向けてください
      </div>
      <button
        onClick={onClose}
        className="mt-6 flex items-center gap-2 px-8 py-2.5 rounded-full bg-warm-800/50 border border-gold-500/40 text-gold-500 text-sm font-medium hover:bg-warm-800/70 transition-colors"
      >
        <X className="w-4 h-4" />
        キャンセル
      </button>
    </div>
  );
}
