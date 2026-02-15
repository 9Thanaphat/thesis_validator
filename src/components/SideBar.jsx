import DocumentMap from "./DocumentMap";
import IssueList from "./IssueList";

const Sidebar = ({
  numPages,
  pageNumber,
  setPageNumber,
  getPageColorClass,
  currentPageIssues,
  handleTogglePageIgnore,
  toggleIssueStatus,
}) => {
  return (
    <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl">
      <DocumentMap
        numPages={numPages}
        pageNumber={pageNumber}
        setPageNumber={setPageNumber}
        getPageColorClass={getPageColorClass}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
          <IssueList
            pageNumber={pageNumber}
            currentPageIssues={currentPageIssues}
            handleTogglePageIgnore={handleTogglePageIgnore}
            toggleIssueStatus={toggleIssueStatus}
          />
      </div>
    </div>
  );
};

export default Sidebar;