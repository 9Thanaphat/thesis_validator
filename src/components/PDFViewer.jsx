import { useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// โหลด Worker จาก CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MM_TO_PT = 2.8346;
const PDF_RENDER_WIDTH = 800;

const PDFViewer = ({
  pdfFile,
  pageNumber,
  numPages,
  setPageNumber,
  setNumPages,
  setPageDimensions,
  pageDimensions,
  marginConfig,
  showRuler,
  renderOverlayBoxes,
  renderMarginGuides,
  renderIndentGuides,
}) => {
  const [rulerPos, setRulerPos] = useState(null); // { xPct, mm }
  const pdfContainerRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!showRuler || !pageDimensions?.width || !marginConfig) return;
    const container = pdfContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const xPct = (mouseX / rect.width) * 100;

    // Convert pixel position to points, then mm
    const ratio = mouseX / rect.width;
    const positionPt = ratio * pageDimensions.width;
    const positionMm = positionPt / MM_TO_PT;
    const distFromLeftMargin = positionMm - marginConfig.left;

    setRulerPos({ xPct: Math.max(0, Math.min(100, xPct)), mm: distFromLeftMargin, totalMm: positionMm });
  }, [showRuler, pageDimensions, marginConfig]);

  const handleMouseLeave = useCallback(() => {
    setRulerPos(null);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Slider Bar */}
      {numPages && numPages > 1 && (
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center gap-4 z-20 shrink-0">
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

      {/* PDF Area */}
      <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-10 relative">
        <div
          ref={pdfContainerRef}
          className="relative shadow-2xl h-fit bg-white"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: showRuler ? 'crosshair' : undefined }}
        >
          {pdfFile ? (
            <Document
              file={pdfFile}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              onLoadError={(error) => console.error("PDF Load Error:", error)}
            >
              <Page
                pageNumber={pageNumber}
                width={PDF_RENDER_WIDTH}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page) => {
                  setPageDimensions({
                    width: page.originalWidth,
                    height: page.originalHeight,
                  });
                }}
              />
              {/* Overlay: Guides + Issue Boxes */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                  {renderMarginGuides && renderMarginGuides()}
                  {renderIndentGuides && renderIndentGuides()}
                  {renderOverlayBoxes()}
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
              {/* Vertical dashed line */}
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
              {/* Tooltip */}
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

export default PDFViewer;
