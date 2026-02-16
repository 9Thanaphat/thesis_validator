import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFilePdf,
  faChevronLeft,
  faChevronRight,
  faBorderAll,
  faIndent,
  faRulerHorizontal,
} from "@fortawesome/free-solid-svg-icons";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Preview = ({ project, onBack }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfData, setPdfData] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [showMarginGuide, setShowMarginGuide] = useState(false);
  const [showIndentGuide, setShowIndentGuide] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [marginConfig, setMarginConfig] = useState(null);
  const [indentConfig, setIndentConfig] = useState(null);
  const [rulerPos, setRulerPos] = useState(null);
  const pdfContainerRef = useRef(null);

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const folder = project.folderName;
        const buffer = await window.electronAPI.getPDFBlob(folder);
        if (buffer) {
          const blob = new Blob([buffer], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfData(url);
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };
    loadPDF();
  }, [project]);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI.getConfig();
        if (config && config.margin_mm) {
          setMarginConfig(config.margin_mm);
        }
        if (config && config.indent_rules) {
          setIndentConfig(config.indent_rules);
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
    };
    loadConfig();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setPageNumber((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setPageNumber((p) => Math.min(numPages || 1, p + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages]);

  const renderMarginGuides = () => {
    if (!showMarginGuide || !marginConfig || !pageDimensions.width) return null;

    const MM_TO_PT = 2.8346;
    const topPt = marginConfig.top * MM_TO_PT;
    const bottomPt = marginConfig.bottom * MM_TO_PT;
    const leftPt = marginConfig.left * MM_TO_PT;
    const rightPt = marginConfig.right * MM_TO_PT;

    const topPct = (topPt / pageDimensions.height) * 100;
    const bottomPct = (bottomPt / pageDimensions.height) * 100;
    const leftPct = (leftPt / pageDimensions.width) * 100;
    const rightPct = (rightPt / pageDimensions.width) * 100;

    const dashH = "repeating-linear-gradient(90deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)";
    const dashV = "repeating-linear-gradient(180deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)";
    const shade = "rgba(59,130,246,0.05)";

    return (
      <>
        <div style={{ position: 'absolute', top: `${topPct}%`, left: 0, width: '100%', height: '1px', backgroundImage: dashH, zIndex: 20, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: `${bottomPct}%`, left: 0, width: '100%', height: '1px', backgroundImage: dashH, zIndex: 20, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: `${leftPct}%`, top: 0, width: '1px', height: '100%', backgroundImage: dashV, zIndex: 20, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: `${rightPct}%`, top: 0, width: '1px', height: '100%', backgroundImage: dashV, zIndex: 20, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${topPct}%`, backgroundColor: shade, zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${bottomPct}%`, backgroundColor: shade, zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: `${leftPct}%`, height: '100%', backgroundColor: shade, zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: `${rightPct}%`, height: '100%', backgroundColor: shade, zIndex: 19, pointerEvents: 'none' }} />
      </>
    );
  };

  // Indent Guide
  const renderIndentGuides = () => {
    if (!showIndentGuide || !indentConfig || !marginConfig || !pageDimensions.width) return null;

    const MM_TO_PT = 2.8346;
    const leftMarginPt = marginConfig.left * MM_TO_PT;

    const indentLines = [
      { key: 'paragraph', label: 'Para', color: '#10b981', mm: indentConfig.paragraph },
      { key: 'sub_section_num', label: 'Sec#', color: '#f59e0b', mm: indentConfig.sub_section_num },
      { key: 'sub_section_text_1', label: 'Sec1', color: '#f97316', mm: indentConfig.sub_section_text_1 },
      { key: 'sub_section_text_2', label: 'Sec2', color: '#ef4444', mm: indentConfig.sub_section_text_2 },
      { key: 'bullet_point', label: 'Bullet', color: '#8b5cf6', mm: indentConfig.bullet_point },
      { key: 'bullet_text', label: 'BulTxt', color: '#ec4899', mm: indentConfig.bullet_text },
    ];

    return indentLines.map(({ key, label, color, mm }, index) => {
      if (mm == null) return null;
      const posPt = leftMarginPt + (mm * MM_TO_PT);
      const posPct = (posPt / pageDimensions.width) * 100;

      return (
        <div key={key} style={{ position: 'absolute', left: `${posPct}%`, top: 0, height: '100%', zIndex: 21, pointerEvents: 'none' }}>
          <div style={{
            width: '1px',
            height: '100%',
            backgroundImage: `repeating-linear-gradient(180deg, ${color}99 0, ${color}99 4px, transparent 4px, transparent 8px)`,
          }} />
          <div
            title={`${label}: ${mm} mm`}
            style={{
              position: 'absolute',
              top: `${4 + index * 16}px`,
              left: '4px',
              fontSize: '8px',
              fontWeight: 700,
              color: color,
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`,
              padding: '1px 4px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              lineHeight: '1.2',
              pointerEvents: 'auto',
              cursor: 'default',
            }}>
            {label}
          </div>
        </div>
      );
    });
  };

  const MM_TO_PT = 2.8346;

  const handleRulerMouseMove = useCallback((e) => {
    if (!showRuler || !pageDimensions?.width || !marginConfig) return;
    const container = pdfContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const xPct = (mouseX / rect.width) * 100;
    const ratio = mouseX / rect.width;
    const positionPt = ratio * pageDimensions.width;
    const positionMm = positionPt / MM_TO_PT;
    const distFromLeftMargin = positionMm - marginConfig.left;
    setRulerPos({ xPct: Math.max(0, Math.min(100, xPct)), mm: distFromLeftMargin, totalMm: positionMm });
  }, [showRuler, pageDimensions, marginConfig]);

  const handleRulerMouseLeave = useCallback(() => {
    setRulerPos(null);
  }, []);

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md">
            <FontAwesomeIcon icon={faFilePdf} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[300px]">
              {project.originalName}
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              Preview Mode — Read Only
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Margin Guide Toggle */}
          <button
            onClick={() => setShowMarginGuide((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              showMarginGuide
                ? "text-blue-700 bg-blue-100 border-blue-300 hover:bg-blue-200"
                : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
            }`}
            title="แสดง/ซ่อนกรอบ Margin"
          >
            <FontAwesomeIcon icon={faBorderAll} />
            <span>Margin</span>
          </button>

          {/* Indent Guide Toggle */}
          <button
            onClick={() => setShowIndentGuide((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              showIndentGuide
                ? "text-emerald-700 bg-emerald-100 border-emerald-300 hover:bg-emerald-200"
                : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
            }`}
            title="แสดง/ซ่อนเส้น Indent"
          >
            <FontAwesomeIcon icon={faIndent} />
            <span>Indent</span>
          </button>

          {/* Ruler Toggle */}
          <button
            onClick={() => setShowRuler((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              showRuler
                ? "text-orange-700 bg-orange-100 border-orange-300 hover:bg-orange-200"
                : "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100"
            }`}
            title="ไม้บรรทัด - วัดระยะ mm จาก margin"
          >
            <FontAwesomeIcon icon={faRulerHorizontal} />
            <span>Ruler</span>
          </button>

          {/* Page Navigation */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-30"
            >
              <FontAwesomeIcon icon={faChevronLeft} size="xs" />
            </button>
            <span className="text-xs font-mono px-4 text-center min-w-[80px]">
              {pageNumber} / {numPages || "-"}
            </span>
            <button
              onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}
              disabled={pageNumber >= numPages}
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-30"
            >
              <FontAwesomeIcon icon={faChevronRight} size="xs" />
            </button>
          </div>
        </div>
      </header>

      {/* Page Slider Bar */}
      {numPages && numPages > 1 && (
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 z-20">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Page
          </span>
          <input
            type="range"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => setPageNumber(Number(e.target.value))}
            className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((pageNumber - 1) / (numPages - 1)) * 100}%, #e2e8f0 ${((pageNumber - 1) / (numPages - 1)) * 100}%, #e2e8f0 100%)`,
              borderRadius: '9999px',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
          <span className="text-xs font-mono text-slate-600 min-w-[70px] text-right">
            {pageNumber} / {numPages}
          </span>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-10 relative">
        <div
          ref={pdfContainerRef}
          className="relative shadow-2xl h-fit bg-white"
          onMouseMove={handleRulerMouseMove}
          onMouseLeave={handleRulerMouseLeave}
          style={{ cursor: showRuler ? 'crosshair' : undefined }}
        >
          {pdfData ? (
            <Document
              file={pdfData}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(error) => console.error("PDF Load Error:", error)}
            >
              <Page
                pageNumber={pageNumber}
                width={800}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page) => {
                  setPageDimensions({
                    width: page.originalWidth,
                    height: page.originalHeight,
                  });
                }}
              />
              {/* Guide Overlays */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="relative w-full h-full">
                  {renderMarginGuides()}
                  {renderIndentGuides()}
                </div>
              </div>
            </Document>
          ) : (
            <div className="p-20 text-slate-400">
              กำลังเตรียมข้อมูลไฟล์ PDF...
            </div>
          )}

          {/* Ruler Line */}
          {showRuler && rulerPos && (
            <>
              <div style={{
                position: 'absolute',
                left: `${rulerPos.xPct}%`,
                top: 0,
                height: '100%',
                width: '1px',
                backgroundImage: 'repeating-linear-gradient(180deg, #f97316 0, #f97316 6px, transparent 6px, transparent 10px)',
                zIndex: 30,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                left: `${rulerPos.xPct}%`,
                top: '8px',
                transform: rulerPos.xPct > 70 ? 'translateX(-110%)' : 'translateX(8px)',
                zIndex: 31,
                pointerEvents: 'none',
                backgroundColor: '#1e293b',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'monospace',
                padding: '4px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                lineHeight: '1.4',
              }}>
                <div style={{ color: '#f97316' }}>
                  ↔ {rulerPos.mm.toFixed(1)} mm <span style={{ color: '#94a3b8', fontSize: '9px' }}>from margin</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '9px' }}>
                  ({rulerPos.totalMm.toFixed(1)} mm from edge)
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Preview;
