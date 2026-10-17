import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  value: string;
  size?: number;
  className?: string;
}

export default function QrCode({ value, size = 180, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#0d0221', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} className={className} style={{ imageRendering: 'pixelated' }} />;
}
