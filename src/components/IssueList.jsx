import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotateLeft, faCheckDouble, faMagnifyingGlass, faCheck } from "@fortawesome/free-solid-svg-icons";

const IssueList = ({ pageNumber, currentPageIssues, handleTogglePageIgnore, toggleIssueStatus }) => {
  return (
    <>
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Page {pageNumber}</h3>
          <span className="text-[10px] text-slate-400">{currentPageIssues.length} issues</span>
        </div>
        {currentPageIssues.length > 0 && (
          <button
            onClick={handleTogglePageIgnore}
            className="text-[10px] font-bold px-3 py-1.5 rounded-full border bg-slate-50 hover:bg-slate-100 transition-all"
          >
            {currentPageIssues.every(i => i.isIgnored) ? "Undo All" : "Resolve All"}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {currentPageIssues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <FontAwesomeIcon icon={faMagnifyingGlass} size="2x" />
            <span className="text-xs">No issues on this page</span>
          </div>
        ) : (
          currentPageIssues.map((issue) => (
            <div
              key={issue.id}
              onClick={() => toggleIssueStatus(issue.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                issue.isIgnored ? "bg-slate-100 opacity-50" : "bg-white shadow-sm border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                  issue.severity === "error" ? "text-rose-600 border-rose-100 bg-rose-50" : "text-amber-600 border-amber-100 bg-amber-50"
                }`}>
                  {issue.code}
                </span>
                {issue.isIgnored && <FontAwesomeIcon icon={faCheck} className="text-blue-500" />}
              </div>
              <p className={`text-xs ${issue.isIgnored ? "line-through text-slate-400" : "text-slate-600"}`}>
                {issue.message}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
};
export default IssueList;