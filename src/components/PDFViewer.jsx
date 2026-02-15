import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// โหลด Worker จาก CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFViewer = ({
  pdfFile, // ตอนนี้จะเป็น URL string เช่น blob:http://localhost...
  pageNumber,
  setNumPages,
  setPageDimensions,
  renderOverlayBoxes,
}) => {
  return (
    <div className="flex-1 bg-slate-200 overflow-auto flex justify-center p-10 relative">
      <div className="relative shadow-2xl h-fit bg-white">
        {pdfFile ? (
          <Document
            file={pdfFile} // ส่ง URL เข้าไปตรงๆ เลย ไม่ต้องใส่ { data: ... }
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
            {/* Overlay Boxes */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="relative w-full h-full pointer-events-auto">
                    {renderOverlayBoxes()}
                </div>
            </div>
          </Document>
        ) : (
          <div className="p-20 text-slate-400">กำลังเตรียมข้อมูลไฟล์ PDF...</div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;