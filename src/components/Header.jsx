import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilePdf,
  faChevronLeft,
  faChevronRight,
  faClipboardCheck,
  faForwardStep,
  faKeyboard,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const Header = ({
  pageNumber,
  numPages,
  setPageNumber,
  jumpToNextIssue,
  handleConfirmReview,
  onBack,
  projectTitle,
}) => {
  return (
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
          <h1 className="text-sm font-bold text-slate-800 truncate max-w-[250px]">
            {projectTitle || "Thesis Validator"}
          </h1>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              <FontAwesomeIcon icon={faKeyboard} /> <b>Enter</b> to Approve & Next
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={jumpToNextIssue}
          className="text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-lg border border-amber-200 transition-all flex items-center gap-2"
        >
          <span>Next Issue</span>
          <FontAwesomeIcon icon={faForwardStep} />
        </button>

        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faChevronLeft} size="xs" />
          </button>
          <span className="text-xs font-mono px-4 text-center min-w-[80px]">
            {pageNumber} / {numPages || "-"}
          </span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
            disabled={pageNumber >= numPages}
            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faChevronRight} size="xs" />
          </button>
        </div>

        <button
          onClick={handleConfirmReview}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <FontAwesomeIcon icon={faClipboardCheck} />
          <span>ยืนยันการตรวจ</span>
        </button>
      </div>
    </header>
  );
};

export default Header;