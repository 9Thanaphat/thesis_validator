import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "../components/Header";
import PDFViewer from "../components/PDFViewer";
import Sidebar from "../components/Sidebar";

const Workspace = ({ project, onBack }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [allIssues, setAllIssues] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  // 1. Load Data from Managed Storage via Electron IPC
  useEffect(() => {
  const loadProjectData = async () => {
    try {
      const folder = project.folderName;

      // 1. โหลดข้อมูลผลการตรวจ (JSON)
      const result = await window.electronAPI.getCheckResult(folder);
      if (result && result.success) {
        setAllIssues(result.data.map((item, idx) => ({ ...item, id: idx, isIgnored: false })));
      }

      // 2. โหลด PDF (Buffer -> Blob URL)
      const buffer = await window.electronAPI.getPDFBlob(folder);
      if (buffer) {
        // [FIX] สร้าง Blob จาก Buffer และสร้าง URL เพื่อความเสถียร
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfData(url);
      }

    } catch (err) {
      console.error("Error loading workspace data:", err);
      alert("ไม่สามารถโหลดข้อมูลโครงการได้");
    }
  };
  loadProjectData();

  // [Cleanup] ลบ URL ทิ้งเมื่อปิดหน้าเพื่อคืน Memory
  return () => {
    if (pdfData) URL.revokeObjectURL(pdfData);
  };
}, [project]);

  // ------------------------------------------------------------------
  // Helper Logic (สถานะหน้า และ การค้นหา)
  // ------------------------------------------------------------------

  const getPageStatus = useCallback((p) => {
    const issues = allIssues.filter((i) => i.page === p);
    if (issues.length === 0) return "clean";

    const active = issues.filter((i) => !i.isIgnored);
    if (active.length === 0) return "resolved";
    if (active.some((i) => i.severity === "error")) return "error";
    if (active.some((i) => i.severity === "warning")) return "warning";

    return "resolved";
  }, [allIssues]);

  const findNextProblemPage = useCallback(() => {
    if (!numPages) return null;
    // วนหาหน้าถัดไปที่มี Error หรือ Warning ที่ยังไม่ได้ Ignore
    for (let p = pageNumber + 1; p <= numPages; p++) {
      const status = getPageStatus(p);
      if (status === "error" || status === "warning") return p;
    }
    return null;
  }, [pageNumber, numPages, getPageStatus]);

  // ------------------------------------------------------------------
  // Actions (จัดการ Issue และ Navigation)
  // ------------------------------------------------------------------

  const toggleIssueStatus = (issueId) => {
    setAllIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, isIgnored: !issue.isIgnored } : issue
      )
    );
  };

  const handleTogglePageIgnore = () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);
    setAllIssues((prev) =>
      prev.map((issue) =>
        issue.page === pageNumber ? { ...issue, isIgnored: hasActive } : issue
      )
    );
  };

  const handleQuickApproveAndNext = () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);

    if (hasActive) {
      setAllIssues((prev) =>
        prev.map((issue) =>
          issue.page === pageNumber ? { ...issue, isIgnored: true } : issue
        )
      );
    }

    if (pageNumber < (numPages || 0)) {
      setPageNumber((p) => p + 1);
    }
  };

  const jumpToNextIssue = () => {
    const nextProblemPage = findNextProblemPage();
    if (nextProblemPage) {
      setPageNumber(nextProblemPage);
    } else {
      alert("🎉 ตรวจครบทุกหน้าแล้ว! ไม่พบปัญหาที่ต้องแก้ไขเพิ่มเติม");
    }
  };

  const handleExportCSV = () => {
    // กรองเอาเฉพาะที่ยังไม่ได้แก้ไข (Active Issues)
    const activeIssues = allIssues.filter((i) => !i.isIgnored);
    const header = "Page,Code,Severity,Message,BBox\n";
    const rows = activeIssues
      .map((i) => `${i.page},${i.code},${i.severity},"${i.message}","${i.bbox ? JSON.stringify(i.bbox) : ""}"`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Final_Report_${project.originalName}.csv`;
    link.click();
  };

  // ------------------------------------------------------------------
  // Keyboard Shortcuts (Arrow Keys & Enter)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowRight":
          setPageNumber((p) => Math.min(numPages || 1, p + 1));
          break;
        case "ArrowLeft":
          setPageNumber((p) => Math.max(1, p - 1));
          break;
        case "Enter":
          e.preventDefault();
          handleQuickApproveAndNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages, pageNumber, allIssues]);

  // ------------------------------------------------------------------
  // UI Rendering Helpers
  // ------------------------------------------------------------------

  const currentPageIssues = useMemo(
    () => allIssues.filter((i) => i.page === pageNumber),
    [allIssues, pageNumber]
  );

  const getPageColorClass = (pageIdx) => {
    const status = getPageStatus(pageIdx);
    switch (status) {
      case "error": return "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100";
      case "warning": return "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100";
      case "resolved": return "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100";
      default: return "bg-white text-slate-400 border-slate-200 hover:border-slate-400";
    }
  };

  const renderOverlayBoxes = () => {
    if (!pageDimensions.width || currentPageIssues.length === 0) return null;
    return currentPageIssues.map((issue) => {
      if (!issue.bbox) return null;
      const [x0, y0, x1, y1] = issue.bbox;

      let borderColor = issue.severity === "error" ? "#e11d48" : "#fbbf24";
      let bgColor = issue.severity === "error" ? "rgba(225, 29, 72, 0.1)" : "rgba(251, 191, 36, 0.15)";
      
      if (issue.isIgnored) {
        borderColor = "#3b82f6";
        bgColor = "rgba(59, 130, 246, 0.1)";
      }

      return (
        <div
          key={issue.id}
          onClick={(e) => { e.stopPropagation(); toggleIssueStatus(issue.id); }}
          className="absolute cursor-pointer transition-all border-2 rounded-sm"
          style={{
            left: `${(x0 / pageDimensions.width) * 100}%`,
            top: `${(y0 / pageDimensions.height) * 100}%`,
            width: `${((x1 - x0) / pageDimensions.width) * 100}%`,
            height: `${((y1 - y0) / pageDimensions.height) * 100}%`,
            borderColor: borderColor,
            backgroundColor: bgColor,
            zIndex: 10,
          }}
          title={issue.message}
        />
      );
    });
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden font-sans">
      <Header
        pageNumber={pageNumber}
        numPages={numPages}
        setPageNumber={setPageNumber}
        jumpToNextIssue={jumpToNextIssue}
        handleExportCSV={handleExportCSV}
        onBack={onBack}
        projectTitle={project.originalName}
      />

      <div className="flex flex-1 overflow-hidden">
        <PDFViewer
          pdfFile={pdfData}
          pageNumber={pageNumber}
          setNumPages={setNumPages}
          setPageDimensions={setPageDimensions}
          renderOverlayBoxes={renderOverlayBoxes}
        />
        <Sidebar
          numPages={numPages}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          getPageColorClass={getPageColorClass}
          currentPageIssues={currentPageIssues}
          handleTogglePageIgnore={handleTogglePageIgnore}
          toggleIssueStatus={toggleIssueStatus}
        />
      </div>
    </div>
  );
};

export default Workspace;