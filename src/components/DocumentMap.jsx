import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark, faTriangleExclamation, faCircleCheck } from "@fortawesome/free-solid-svg-icons";

const DocumentMap = ({ numPages, pageNumber, setPageNumber, getPageColorClass }) => {
  return (
    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
      <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Document Map</h2>
      <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto pr-2">
        {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => setPageNumber(p)}
            className={`aspect-square rounded border text-[10px] font-bold transition-all ${getPageColorClass(p)} ${
              pageNumber === p ? "ring-2 ring-slate-800 ring-offset-1 scale-105" : ""
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-[9px] font-bold text-slate-500">
        <span className="flex items-center gap-1"><FontAwesomeIcon icon={faCircleXmark} className="text-rose-500" /> Error</span>
        <span className="flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" /> Warning</span>
        <span className="flex items-center gap-1"><FontAwesomeIcon icon={faCircleCheck} className="text-blue-500" /> Resolved</span>
      </div>
    </div>
  );
};
export default DocumentMap;