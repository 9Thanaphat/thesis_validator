import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faMagnifyingGlass,
  faFileLines,
  faClock,
  faCircleCheck,
  faArrowRight,
  faRotateRight,
  faGear,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

const Dashboard = ({ onSelectProject, onOpenSettings }) => {
  const [isBackendOnline, setIsBackendOnline] = useState(null);
  const [projects, setProjects] = useState([]);
  const [checkingId, setCheckingId] = useState(null);

  // 1. โหลดรายการโปรเจกต์ทั้งหมด
  const loadProjects = async () => {
    try {
      // ตรงนี้ electronAPI.getProjects() ต้องส่ง stats กลับมา
      const data = await window.electronAPI.getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const checkStatus = async () => {
    try {
      const result = await window.electronAPI.checkBackend();
      setIsBackendOnline(result.online);
    } catch (error) {
      setIsBackendOnline(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. ฟังก์ชันนำเข้าไฟล์ PDF ใหม่
  const handleAddNew = async () => {
    try {
      const filePath = await window.electronAPI.selectFile();
      if (!filePath) return;

      const result = await window.electronAPI.importThesis(filePath);
      if (result.success) {
        await loadProjects();
      } else {
        alert("เกิดข้อผิดพลาด: " + result.error);
      }
    } catch (error) {
      console.error("Import Error:", error);
      alert("ไม่สามารถนำเข้าไฟล์ได้");
    }
  };

  // 3. ฟังก์ชันส่งไปตรวจที่ Python Backend
  const handleRunCheck = async (proj) => {
    setCheckingId(proj.id);
    try {
      const fullPdfPath = await window.electronAPI.getProjectPath(
        proj.folderName,
      );
      const result = await window.electronAPI.testCheckPDF(fullPdfPath);

      if (result.status === "success" || !result.error) {
        // [Tip] ไม่ต้อง Alert ก็ได้ ให้มันรีโหลดแล้วโชว์ Badge สถานะแทนจะดูสมูทกว่า
        await loadProjects();
      } else {
        alert("ตรวจไม่สำเร็จ: " + (result.error || result.detail));
      }
    } catch (error) {
      console.error("Check Error:", error);
      alert("การเชื่อมต่อ Backend ขัดข้อง หรือ Python ทำงานผิดพลาด");
    } finally {
      setCheckingId(null);
    }
  };

  // 4. ฟังก์ชันลบโปรเจกต์
  const handleDelete = async (folderName) => {
    if (
      window.confirm(
        "⚠️ ยืนยันการลบไฟล์งานนี้?\nข้อมูลและผลตรวจทั้งหมดในโฟลเดอร์จะถูกลบถาวร",
      )
    ) {
      try {
        const result = await window.electronAPI.deleteProject(folderName);
        if (result.success) {
          await loadProjects();
        } else {
          alert("ลบไม่สำเร็จ: " + result.error);
        }
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 flex flex-col gap-8 font-sans">
      {/* --- Header Section --- */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Project Management
          </h2>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase mb-2 ${
              isBackendOnline === true
                ? "bg-green-50 text-green-600 border border-green-200"
                : isBackendOnline === false
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : "bg-slate-50 text-slate-400 border border-slate-200"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${isBackendOnline === true ? "bg-green-500 animate-pulse" : isBackendOnline === false ? "bg-rose-500" : "bg-slate-300"}`}
            />
            {isBackendOnline === true
              ? "Backend Online"
              : isBackendOnline === false
                ? "Backend Offline"
                : "Checking..."}
          </div>
          <p className="text-sm text-slate-500 font-medium">
            จัดการและตรวจสอบความถูกต้องของวิทยานิพนธ์
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-500 font-bold text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-all shadow-sm active:scale-95 group"
            title="ตั้งค่าระบบ"
          >
            <FontAwesomeIcon
              icon={faGear}
              className="text-slate-400 group-hover:rotate-90 transition-transform duration-500"
            />
            <span>Settings</span>
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>นำเข้าไฟล์ใหม่</span>
          </button>
        </div>
      </div>

      {/* --- Project Grid/List --- */}
      <div className="grid gap-4">
        {projects.length > 0 ? (
          projects.map((proj) => {
            const isChecked = proj.status === "checked";
            // ดึงค่า stats ที่ส่งมาจาก electron (ถ้าไม่มีให้กันพังด้วย {})
            const stats = proj.stats || { total: 0, resolved: 0, remaining: 0 };

            return (
              <div
                key={proj.id}
                className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
              >
                <div className="flex items-start gap-5 flex-1">
                  {/* Icon Status */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${
                      isChecked
                        ? stats.remaining === 0 && stats.total > 0
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-50 text-blue-500"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={isChecked ? faCircleCheck : faFileLines}
                      size="xl"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg text-slate-800 truncate max-w-md">
                        {proj.originalName}
                      </h3>

                      {/* --- STATUS BADGE (จุดสำคัญ) --- */}
                      {isChecked ? (
                        stats.total > 0 ? (
                          stats.remaining === 0 ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                              <FontAwesomeIcon icon={faCircleCheck} />
                              All Resolved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                              <FontAwesomeIcon icon={faTriangleExclamation} />
                              {stats.remaining} Issues Left
                            </span>
                          )
                        ) : (
                          // กรณี Checked แต่ไม่เจอ Issue เลย (Clean)
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                            Clean Pass
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          Waiting for Check
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mt-1">
                      <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon
                          icon={faClock}
                          className="text-slate-300"
                        />
                        {new Date(proj.importDate).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-slate-200">|</span>
                      <span>ID: {proj.id.toString().slice(-6)}</span>
                    </div>

                    {/* Progress Bar (แสดงเฉพาะตอน Checked และมี Issue) */}
                    {isChecked && stats.total > 0 && stats.remaining > 0 && (
                      <div className="w-full max-w-[240px] h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${(stats.resolved / stats.total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex gap-3 items-center ml-6">
                  {!isChecked ? (
                    <button
                      disabled={checkingId === proj.id}
                      onClick={() => handleRunCheck(proj)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        checkingId === proj.id
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        spin={checkingId === proj.id}
                      />
                      {checkingId === proj.id ? "Checking..." : "Start Check"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRunCheck(proj)}
                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ตรวจใหม่ (Reset Status)"
                      >
                        <FontAwesomeIcon
                          icon={faRotateRight}
                          spin={checkingId === proj.id}
                        />
                      </button>
                      <button
                        onClick={() => onSelectProject(proj)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <span>Open Report</span>
                        <FontAwesomeIcon icon={faArrowRight} size="xs" />
                      </button>
                    </>
                  )}

                  <div className="h-8 w-px bg-slate-100 mx-2"></div>

                  <button
                    onClick={() => handleDelete(proj.folderName)}
                    className="w-10 h-10 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center"
                    title="ลบโครงการ"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* --- Empty State --- */
          <div
            onClick={handleAddNew}
            className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-white group-hover:text-blue-500 transition-all shadow-sm">
              <FontAwesomeIcon icon={faPlus} size="xl" />
            </div>
            <h4 className="text-slate-800 font-bold">ยังไม่มีไฟล์ในระบบ</h4>
            <p className="text-slate-400 text-sm mt-1">
              คลิกที่นี่เพื่อนำเข้าไฟล์ PDF ของนักศึกษาและเริ่มการตรวจสอบ
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
