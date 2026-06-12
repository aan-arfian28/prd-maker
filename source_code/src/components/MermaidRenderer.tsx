"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mermaid from "mermaid";

// ── One-time mermaid init ──────────────────────────────────────────────
let mermaidInitialized = false;

function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      fontFamily: '"Geist Mono", ui-monospace, monospace',
      themeVariables: {
        primaryColor: "#6366f1",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#818cf8",
        lineColor: "#475569",
        secondaryColor: "#e0e7ff",
        tertiaryColor: "#f1f5f9",
      },
    });
    mermaidInitialized = true;
  }
}

// ── Content-hash cache ─────────────────────────────────────────────────
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

const svgCache = new Map<string, string>();

// ── Props ──────────────────────────────────────────────────────────────
interface MermaidRendererProps {
  chart: string;
  index: number;
}

// ── Constants ──────────────────────────────────────────────────────────
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.15;

// ── Component ──────────────────────────────────────────────────────────
export default function MermaidRenderer({ chart, index }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgWrapperRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const renderingRef = useRef(false);

  // Pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stable cache key from chart content
  const cacheKey = useMemo(() => hashString(chart.trim()), [chart]);

  // Reset zoom/pan when chart changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSvg("");
    setError(null);
    setShouldRender(false);
    renderingRef.current = false;
  }, [cacheKey]);

  // ── Lazy-load ──────────────────────────────────────────────────────
  useEffect(() => {
    const cached = svgCache.get(cacheKey);
    if (cached) {
      setSvg(cached);
      setShouldRender(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cacheKey]);

  // ── Render mermaid → SVG ──────────────────────────────────────────
  useEffect(() => {
    if (!shouldRender) return;
    if (renderingRef.current) return;

    const cached = svgCache.get(cacheKey);
    if (cached) {
      setSvg(cached);
      return;
    }

    initMermaid();
    renderingRef.current = true;

    const rafId = requestAnimationFrame(() => {
      const id = `mermaid-${cacheKey}`;
      mermaid
        .render(id, chart.trim())
        .then(({ svg: renderedSvg }) => {
          // Strip max-width so SVG can scale freely
          const unconstrainedSvg = renderedSvg.replace(
            /max-width:\s*[\d.]+%?;?/gi,
            ""
          );
          svgCache.set(cacheKey, unconstrainedSvg);
          setSvg(unconstrainedSvg);
          setError(null);
        })
        .catch((err: unknown) => {
          console.error("Mermaid render error:", err);
          setError(
            err instanceof Error ? err.message : "Gagal merender diagram"
          );
        })
        .finally(() => {
          renderingRef.current = false;
        });
    });

    return () => {
      cancelAnimationFrame(rafId);
      renderingRef.current = false;
    };
  }, [shouldRender, cacheKey, chart]);

  // ── Auto-fit on first render ──────────────────────────────────────
  // After SVG lands in the DOM, measure it and scale to fit the canvas.
  useEffect(() => {
    if (!svg) return;

    // Small delay so the browser has laid out the SVG
    const timer = setTimeout(() => {
      const svgEl = svgWrapperRef.current?.querySelector("svg") as
        | SVGSVGElement
        | null;
      if (!svgEl) return;

      const viewBox = svgEl.viewBox?.baseVal;
      const svgW = viewBox?.width ?? svgEl.getBoundingClientRect().width;
      const svgH = viewBox?.height ?? svgEl.getBoundingClientRect().height;

      const container = svgWrapperRef.current?.parentElement;
      if (!container || !svgW || !svgH) return;

      // Available canvas area (leave some padding)
      const containerW = container.clientWidth - 48;
      const containerH = container.clientHeight - 48;

      if (containerW <= 0 || containerH <= 0) return;

      const scaleX = containerW / svgW;
      const scaleY = containerH / svgH;
      const fitZoom = Math.min(scaleX, scaleY, 1.5); // cap at 1.5x

      if (fitZoom < 0.95 || fitZoom > 1.05) {
        // Only auto-adjust if significantly different from 1
        // Floor at 0.5 so large diagrams are still readable
        setZoom(Math.max(1.5, Math.min(MAX_ZOOM, fitZoom)));
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [svg, cacheKey]);

  // ── Pan & Zoom handlers ────────────────────────────────────────────

  // Mouse drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag on direct click on the canvas area (not buttons)
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
    },
    [panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPanX(dragStart.current.panX + dx);
      setPanY(dragStart.current.panY + dy);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Mouse wheel zoom ─────────────────────────────────────────────
  // We use a ref + manual listener because React's onWheel is passive
  // and won't let us preventDefault to stop page scroll.
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Button handlers
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const zoomReset = useCallback(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const zoomFit = useCallback(() => {
    if (!svgWrapperRef.current) return;
    const wrapper = svgWrapperRef.current;
    const svgEl = wrapper.querySelector("svg") as SVGSVGElement | null;
    if (!svgEl) return;

    // Get the actual SVG dimensions from its viewBox or bounding box
    const viewBox = svgEl.viewBox?.baseVal;
    const svgW = viewBox?.width ?? svgEl.getBoundingClientRect().width;
    const svgH = viewBox?.height ?? svgEl.getBoundingClientRect().height;

    const containerW = wrapper.clientWidth - 32; // padding
    const containerH = wrapper.clientHeight - 32;

    if (svgW && svgH && containerW && containerH) {
      const scaleX = containerW / svgW;
      const scaleY = containerH / svgH;
      const fitZoom = Math.min(scaleX, scaleY, 2.0); // cap at 2x
      setZoom(Math.max(MIN_ZOOM, fitZoom));
    }
    setPanX(0);
    setPanY(0);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    // Reset pan/zoom when toggling
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, []);

  // Keyboard shortcuts in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") zoomReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen, zoomIn, zoomOut, zoomReset]);

  // ── Error state ────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="my-4 border border-red-300 rounded-lg overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b border-red-300 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium text-red-700">Diagram Error</span>
        </div>
        <div className="p-4 bg-red-50/50">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <details>
            <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
              Lihat kode
            </summary>
            <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-x-auto whitespace-pre-wrap">
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────
  if (!svg) {
    return (
      <div className="my-4 border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Diagram
          </span>
        </div>
        <div className="p-8 flex items-center justify-center bg-white" style={{ minHeight: 200 }}>
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-sm">Merender diagram...</span>
          </div>
        </div>
        <div ref={containerRef} className="w-full h-0" />
      </div>
    );
  }

  // ── Zoom toolbar ──────────────────────────────────────────────────
  const Toolbar = (
    <div className="flex items-center gap-0.5">
      {/* Zoom Out */}
      <button
        onClick={zoomOut}
        title="Zoom out"
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
      </button>

      <span className="text-xs text-gray-400 font-mono min-w-[3rem] text-center select-none">
        {Math.round(zoom * 100)}%
      </span>

      {/* Zoom In */}
      <button
        onClick={zoomIn}
        title="Zoom in"
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>

      {/* Fit to screen */}
      <button
        onClick={zoomFit}
        title="Fit to screen"
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
      </button>

      {/* Reset zoom */}
      <button
        onClick={zoomReset}
        title="Reset zoom & position"
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </button>

      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Fullscreen */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M8 3H5a2 2 0 00-2 2v3" />
          <path d="M21 8V5a2 2 0 00-2-2h-3" />
          <path d="M3 16v3a2 2 0 002 2h3" />
          <path d="M16 21h3a2 2 0 002-2v-3" />
        </svg>
      </button>
    </div>
  );

  // ── Canvas area ───────────────────────────────────────────────────
  const canvasClasses = isFullscreen
    ? "flex-1 overflow-hidden bg-white"
    : "overflow-hidden bg-white";

  const canvasStyle = isFullscreen
    ? undefined
    : { minHeight: 360, maxHeight: 1200 };

  return (
    <div
      className={`my-4 border border-gray-200 rounded-lg ${
        isFullscreen ? "fixed inset-0 z-50 m-0 border-0 rounded-none flex flex-col bg-white" : ""
      }`}
    >
      {/* Header bar */}
      <div
        className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0"
      >
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Diagram
        </span>
        <div className="flex items-center gap-2">
          {Toolbar}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Tutup fullscreen (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        className={canvasClasses}
        style={canvasStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={canvasRef}
      >
        <div
          ref={svgWrapperRef}
          className="mermaid-container w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: "center center",
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          <div
            className="mermaid-svg-wrapper"
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ pointerEvents: isDragging ? "none" : "auto" }}
          />
        </div>

        {/* Hint overlay (shown briefly when diagram first loads) */}
        {!isDragging && zoom === 1 && (
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 pointer-events-none select-none">
            Scroll to zoom &bull; Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}
