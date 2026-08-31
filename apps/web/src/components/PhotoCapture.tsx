import { useEffect, useRef, useState } from 'react';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
}

export function PhotoCapture({ onCapture, onCancel }: PhotoCaptureProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize camera stream
  useEffect(() => {
    if (mode === 'camera' && !previewUrl) {
      setError(null);
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error('Camera access failed:', err);
          setError('Could not access camera. Please check permissions or upload a file instead.');
          setMode('upload');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mode, previewUrl]);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  function handleCapture() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopCamera();
        }
      },
      'image/jpeg',
      0.85
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }

  function handleSave() {
    if (capturedBlob) {
      const filename = `capture-${Date.now()}.jpg`;
      const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
      onCapture(file);
      handleReset();
    }
  }

  function handleReset() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedBlob(null);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <h3 className="font-semibold text-ink">Capture Device Photo</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              handleReset();
              setMode('camera');
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
              mode === 'camera'
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface border-border text-ink hover:bg-canvas'
            }`}
          >
            Camera
          </button>
          <button
            type="button"
            onClick={() => {
              handleReset();
              stopCamera();
              setMode('upload');
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium border ${
              mode === 'upload'
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface border-border text-ink hover:bg-canvas'
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-error-bg p-3 border border-error-border text-xs text-error">
          {error}
        </div>
      ) : null}

      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas">
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
        ) : mode === 'camera' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center hover:bg-surface-hover"
          >
            <span className="text-2xl text-muted">📁</span>
            <span className="text-sm font-medium text-ink">Click or drop to select image</span>
            <span className="text-xs text-muted">Supports JPEG, PNG</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-2.5">
        {onCancel ? (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
          >
            Cancel
          </button>
        ) : null}

        {previewUrl ? (
          <>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-primary bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover"
            >
              Use Photo
            </button>
          </>
        ) : mode === 'camera' ? (
          <button
            type="button"
            onClick={handleCapture}
            className="rounded-lg border border-primary bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            Capture Photo
          </button>
        ) : null}
      </div>
    </div>
  );
}
