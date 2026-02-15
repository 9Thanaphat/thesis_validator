import DocumentMap from "./DocumentMap";
import IssueList from "./IssueList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faCircleXmark,
  faCircleCheck,
  faFileImport,
  faChartPie, // เพิ่มไอคอนสำหรับความคืบหน้า
} from "@fortawesome/free-solid-svg-icons";

const Sidebar = ({
  numPages,
  pageNumber,
  setPageNumber,
  getPageColorClass,
  allIssues = [],
  currentPageIssues = [],
  handleTogglePageIgnore,
  toggleIssueStatus,
}) => {
  const activeIssues = allIssues.filter((i) => !i.isIgnored);
  const totalRemaining = activeIssues.length;

  // คำนวณเปอร์เซ็นต์ความสำเร็จ
  const progressPercent =
    allIssues.length > 0
      ? ((allIssues.length - totalRemaining) / allIssues.length) * 100
      : 0;

  const totalErrors = activeIssues.filter((i) => {
    const sev = (i.severity || "").toString().toLowerCase();
    const msg = (i.message || "").toString().toLowerCase();
    return (
      sev === "error" ||
      msg === "error" ||
      sev.includes("error") ||
      msg.includes("error")
    );
  }).length;

  const totalWarnings = activeIssues.filter((i) => {
    const sev = (i.severity || "").toString().toLowerCase();
    const msg = (i.message || "").toString().toLowerCase();
    return (
      sev === "warning" ||
      msg === "warning" ||
      sev.includes("warn") ||
      msg.includes("warn")
    );
  }).length;

  return (
    <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl font-sans">
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
          <div
            className="h-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)] transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <FontAwesomeIcon icon={faChartPie} className="text-blue-400/60" />
              Total Issues Remaining
            </div>
            <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 text-[10px] font-bold">
              <FontAwesomeIcon icon={faFileImport} size="xs" />
              {numPages} PAGES
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <span className="text-4xl font-black leading-none tracking-tight">
                {totalRemaining}
              </span>
              <span className="text-slate-500 text-xs font-bold ml-2 font-thai uppercase tracking-wide">
                Issues Left
              </span>
            </div>

            <div className="flex flex-col gap-1.5 border-l border-slate-700 pl-4">
              <div
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${totalErrors > 0 ? "text-rose-400" : "text-slate-600"}`}
              >
                <FontAwesomeIcon
                  icon={faCircleXmark}
                  size="xs"
                  className={totalErrors > 0 ? "animate-pulse" : ""}
                />
                <span>{totalErrors} Errors</span>
              </div>
              <div
                className={`flex items-center gap-2 text-xs font-bold transition-colors ${totalWarnings > 0 ? "text-amber-400" : "text-slate-600"}`}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} size="xs" />
                <span>{totalWarnings} Warnings</span>
              </div>
            </div>
          </div>

          {/* แสดงข้อความเมื่อตรวจเสร็จแล้ว 100% */}
          {progressPercent === 100 && (
            <div className="mt-3 text-[10px] font-bold text-blue-400 flex items-center gap-1 animate-bounce">
              <FontAwesomeIcon icon={faCircleCheck} />
              All issues resolved! Ready to export.
            </div>
          )}
        </div>
      </div>

      <DocumentMap
        numPages={numPages}
        pageNumber={pageNumber}
        setPageNumber={setPageNumber}
        getPageColorClass={getPageColorClass}
      />

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Current Page ({currentPageIssues.length})
          </span>
          {currentPageIssues.length === 0 && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500">
              <FontAwesomeIcon icon={faCircleCheck} />
              CLEAN
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <IssueList
            pageNumber={pageNumber}
            currentPageIssues={currentPageIssues}
            handleTogglePageIgnore={handleTogglePageIgnore}
            toggleIssueStatus={toggleIssueStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
