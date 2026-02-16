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
  const [showMarginGuide, setShowMarginGuide] = useState(false);
  const [showIndentGuide, setShowIndentGuide] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [marginConfig, setMarginConfig] = useState(null);
  const [indentConfig, setIndentConfig] = useState(null);

  // 0. Load config from config.json
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


  // 1. Load Data from Managed Storage via Electron IPC
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const folder = project.folderName;

        // 1. โหลดข้อมูลผลการตรวจ (JSON)
        const result = await window.electronAPI.getCheckResult(folder);
        if (result && result.success) {
          // result.data คือ file content จาก document_result.json
          // Python ส่งกลับมาเป็น { issues: [...] } หรือ { data: [...] } หรือ Array โดยตรง
          const rawData = result.data;
          let rawIssues = [];
          
          if (Array.isArray(rawData)) {
            // กรณีเป็น Array โดยตรง
            rawIssues = rawData;
          } else if (rawData && Array.isArray(rawData.issues)) {
            // กรณี Python ส่ง { issues: [...] }
            rawIssues = rawData.issues;
          } else if (rawData && Array.isArray(rawData.data)) {
            // กรณีเก่า { data: [...] }
            rawIssues = rawData.data;
          }

          setAllIssues(rawIssues.map((item, idx) => ({ 
            ...item, 
            id: idx, 
            // Handle both Python's is_ignored (snake_case) and JavaScript's isIgnored (camelCase)
            isIgnored: item.is_ignored === true || item.isIgnored === true
          })));
        }

        // 2. โหลด PDF (Buffer -> Blob URL)
        const buffer = await window.electronAPI.getPDFBlob(folder);
        if (buffer) {
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

    return () => {
      if (pdfData) URL.revokeObjectURL(pdfData);
    };
  }, [project]);

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
    for (let p = pageNumber + 1; p <= numPages; p++) {
      const status = getPageStatus(p);
      if (status === "error" || status === "warning") return p;
    }
    return null;
  }, [pageNumber, numPages, getPageStatus]);

  const toggleIssueStatus = async (issueId) => {
    const updatedIssues = allIssues.map((issue) =>
      issue.id === issueId ? { ...issue, isIgnored: !issue.isIgnored } : issue,
    );
    setAllIssues(updatedIssues);

    // 2. ส่งไปบันทึกลงไฟล์ JSON ทันที
    try {
      await window.electronAPI.saveCheckResult({
        folderName: project.folderName,
        issues: updatedIssues, // ส่งก้อนใหม่ที่มี isIgnored: true ไป
      });
      console.log("Auto-saved progress!");
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  };

  const handleTogglePageIgnore = async () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);
    const updatedIssues = allIssues.map((issue) =>
      issue.page === pageNumber ? { ...issue, isIgnored: hasActive } : issue
    );
    setAllIssues(updatedIssues);

    // บันทึกลงไฟล์ JSON ทันที
    try {
      await window.electronAPI.saveCheckResult({
        folderName: project.folderName,
        issues: updatedIssues,
      });
      console.log("Auto-saved (page toggle)!");
    } catch (err) {
      console.error("Failed to save (page toggle):", err);
    }
  };

  const handleQuickApproveAndNext = async () => {
    const pageIssues = allIssues.filter((i) => i.page === pageNumber);
    const hasActive = pageIssues.some((i) => !i.isIgnored);

    if (hasActive) {
      const updatedIssues = allIssues.map((issue) =>
        issue.page === pageNumber ? { ...issue, isIgnored: true } : issue
      );
      setAllIssues(updatedIssues);

      // บันทึกลงไฟล์ JSON ทันที
      try {
        await window.electronAPI.saveCheckResult({
          folderName: project.folderName,
          issues: updatedIssues,
        });
        console.log("Auto-saved (quick approve)!");
      } catch (err) {
        console.error("Failed to save (quick approve):", err);
      }
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
      alert("ตรวจครบทุกหน้าแล้ว! ไม่พบปัญหาที่ต้องแก้ไขเพิ่มเติม");
    }
  };

  const handleConfirmReview = async () => {
    if (!window.confirm("ยืนยันการตรวจ?\nระบบจะบันทึกสถานะว่าอาจารย์ตรวจแล้ว")) return;
    try {
      const result = await window.electronAPI.confirmReview(project.folderName);
      if (result.success) {
        onBack(); // กลับไปหน้า Dashboard
      } else {
        alert("เกิดข้อผิดพลาด: " + result.error);
      }
    } catch (err) {
      console.error("Confirm review error:", err);
      alert("ไม่สามารถยืนยันการตรวจได้");
    }
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

  const currentPageIssues = useMemo(
    () => allIssues.filter((i) => i.page === pageNumber),
    [allIssues, pageNumber]
  );

  // ฟังก์ชันคำนวณสีของหน้าใน Document Map
const getPageColorClass = (page) => {
    // 1. แปลง page เป็นตัวเลขให้ชัวร์
    const pageNum = parseInt(page);
    const pageIssues = allIssues.filter((i) => parseInt(i.page) === pageNum);

    // ถ้าไม่มี Issue เลย -> สีขาว
    if (pageIssues.length === 0) {
        return "bg-white text-slate-400 border-slate-200 hover:border-blue-400";
    }

    const activeIssues = pageIssues.filter(i => !i.isIgnored);

    // ถ้ากด Resolve หมดแล้ว -> สีฟ้า (Resolved)
    if (activeIssues.length === 0) {
        return "bg-blue-50 text-blue-600 border-blue-200";
    }

    const isError = activeIssues.some(i => {
        const sev = (i.severity || "").toString().toLowerCase();
        const msg = (i.message || "").toString().toLowerCase();
        // ถ้าช่องไหนมีคำว่า error หรือ critical ให้ถือว่าเป็น Error (สีแดง)
        return sev === "error" || msg === "error" || sev.includes("error") || msg.includes("error");
    });

    if (isError) {
        return "bg-rose-100 text-rose-600 border-rose-200"; // 🔴 สีแดง
    }

    const isWarning = activeIssues.some(i => {
        const sev = (i.severity || "").toString().toLowerCase();
        const msg = (i.message || "").toString().toLowerCase();
        // ถ้าช่องไหนมีคำว่า warning ให้ถือว่าเป็น Warning (สีเหลือง)
        return sev === "warning" || msg === "warning" || sev.includes("warn") || msg.includes("warn");
    });
    
    if (isWarning) {
        return "bg-amber-100 text-amber-600 border-amber-200";
    }

    // Default (Info)
    return "bg-blue-50 text-blue-600 border-blue-200";
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

  // Margin Guide: แสดงเส้น margin บน PDF
  const renderMarginGuides = () => {
    if (!showMarginGuide || !marginConfig || !pageDimensions.width) return null;

    // A4: 210mm x 297mm, PDF points: 595.28 x 841.89
    // 1mm = 2.8346 pt
    const MM_TO_PT = 2.8346;
    const topPt = marginConfig.top * MM_TO_PT;
    const bottomPt = marginConfig.bottom * MM_TO_PT;
    const leftPt = marginConfig.left * MM_TO_PT;
    const rightPt = marginConfig.right * MM_TO_PT;

    const topPct = (topPt / pageDimensions.height) * 100;
    const bottomPct = (bottomPt / pageDimensions.height) * 100;
    const leftPct = (leftPt / pageDimensions.width) * 100;
    const rightPct = (rightPt / pageDimensions.width) * 100;

    const guideStyle = {
      position: 'absolute',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      zIndex: 20,
      pointerEvents: 'none',
    };

    return (
      <>
        {/* Top margin line */}
        <div style={{ ...guideStyle, top: `${topPct}%`, left: 0, width: '100%', height: '1px',
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)',
          backgroundColor: 'transparent'
        }} />
        {/* Bottom margin line */}
        <div style={{ ...guideStyle, bottom: `${bottomPct}%`, left: 0, width: '100%', height: '1px',
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)',
          backgroundColor: 'transparent'
        }} />
        {/* Left margin line */}
        <div style={{ ...guideStyle, left: `${leftPct}%`, top: 0, width: '1px', height: '100%',
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)',
          backgroundColor: 'transparent'
        }} />
        {/* Right margin line */}
        <div style={{ ...guideStyle, right: `${rightPct}%`, top: 0, width: '1px', height: '100%',
          backgroundImage: 'repeating-linear-gradient(180deg, rgba(59,130,246,0.7) 0, rgba(59,130,246,0.7) 6px, transparent 6px, transparent 12px)',
          backgroundColor: 'transparent'
        }} />
        {/* Shaded areas outside margins */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${topPct}%`, backgroundColor: 'rgba(59,130,246,0.05)', zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: `${bottomPct}%`, backgroundColor: 'rgba(59,130,246,0.05)', zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: `${leftPct}%`, height: '100%', backgroundColor: 'rgba(59,130,246,0.05)', zIndex: 19, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: `${rightPct}%`, height: '100%', backgroundColor: 'rgba(59,130,246,0.05)', zIndex: 19, pointerEvents: 'none' }} />
      </>
    );
  };

  // Indent Guide: แสดงเส้น indent แนวตั้งบน PDF
  const renderIndentGuides = () => {
    if (!showIndentGuide || !indentConfig || !marginConfig || !pageDimensions.width) return null;

    const MM_TO_PT = 2.8346;
    const leftMarginPt = marginConfig.left * MM_TO_PT;

    // กำหนดสี + label สำหรับแต่ละ indent rule
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
          {/* Vertical dashed line */}
          <div style={{
            width: '1px',
            height: '100%',
            backgroundImage: `repeating-linear-gradient(180deg, ${color}99 0, ${color}99 4px, transparent 4px, transparent 8px)`,
          }} />
          {/* Label - staggered vertically to avoid overlap */}
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

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden font-sans">
      <Header
        pageNumber={pageNumber}
        numPages={numPages}
        setPageNumber={setPageNumber}
        jumpToNextIssue={jumpToNextIssue}
        handleConfirmReview={handleConfirmReview}
        onBack={onBack}
        projectTitle={project.originalName}
        showMarginGuide={showMarginGuide}
        onToggleMarginGuide={() => setShowMarginGuide(prev => !prev)}
        showIndentGuide={showIndentGuide}
        onToggleIndentGuide={() => setShowIndentGuide(prev => !prev)}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler(prev => !prev)}
      />

      <div className="flex flex-1 overflow-hidden">
        <PDFViewer
          pdfFile={pdfData}
          pageNumber={pageNumber}
          numPages={numPages}
          setPageNumber={setPageNumber}
          setNumPages={setNumPages}
          setPageDimensions={setPageDimensions}
          pageDimensions={pageDimensions}
          marginConfig={marginConfig}
          showRuler={showRuler}
          renderOverlayBoxes={renderOverlayBoxes}
          renderMarginGuides={renderMarginGuides}
          renderIndentGuides={renderIndentGuides}
        />
        <Sidebar
          numPages={numPages}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          getPageColorClass={getPageColorClass}
          currentPageIssues={currentPageIssues}
          handleTogglePageIgnore={handleTogglePageIgnore}
          toggleIssueStatus={toggleIssueStatus}
          allIssues={allIssues}
        />
      </div>
    </div>
  );
};

export default Workspace;