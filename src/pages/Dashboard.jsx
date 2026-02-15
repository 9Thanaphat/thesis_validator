import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faPlus, 
    faTrash, 
    faMagnifyingGlass, 
    faFileLines, 
    faClock,
    faCircleCheck,
    faArrowRight,
    faRotateRight
} from "@fortawesome/free-solid-svg-icons";

const Dashboard = ({ onSelectProject }) => {
    const [projects, setProjects] = useState([]);
    const [checkingId, setCheckingId] = useState(null);

    // 1. โหลดรายการโปรเจกต์ทั้งหมดจาก Storage
    const loadProjects = async () => {
        try {
            const data = await window.electronAPI.getProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    useEffect(() => {
        loadProjects();
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
            const fullPdfPath = await window.electronAPI.getProjectPath(proj.folderName);
            
            // เรียกใช้ฟังก์ชันตรวจ PDF (ผ่าน IPC ไปหา Python)
            const result = await window.electronAPI.testCheckPDF(fullPdfPath);

            // ตรวจสอบผลลัพธ์ (รองรับกรณี 500 Error หรือ JSON พัง)
            if (result.status === "success" || !result.error) {
                alert("ตรวจเสร็จสมบูรณ์!");
                await loadProjects(); // อัปเดต List เพื่อโชว์ปุ่ม Recheck
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
        if (window.confirm("⚠️ ยืนยันการลบไฟล์งานนี้?\nข้อมูลและผลตรวจทั้งหมดในโฟลเดอร์จะถูกลบถาวร")) {
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
        <div className="max-w-5xl mx-auto py-8 px-4 flex flex-col gap-8">
            {/* --- Header Section --- */}
            <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Project Management</h2>
                    <p className="text-sm text-slate-500 font-medium">จัดการและตรวจสอบความถูกต้องของวิทยานิพนธ์</p>
                </div>
                <button 
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 flex items-center gap-2 active:scale-95"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>นำเข้าไฟล์ใหม่</span>
                </button>
            </div>

            {/* --- Project Grid/List --- */}
            <div className="grid gap-4">
                {projects.length > 0 ? (
                    projects.map(proj => {
                        // เช็คสถานะการตรวจ (Pending / Checked)
                        const isChecked = proj.status === 'checked';

                        return (
                            <div key={proj.id} className="group flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                                <div className="flex items-start gap-5 flex-1">
                                    {/* Icon เปลี่ยนตามสถานะ */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isChecked ? 'bg-green-50 text-green-500' : 'bg-slate-100 text-slate-400'}`}>
                                        <FontAwesomeIcon icon={isChecked ? faCircleCheck : faFileLines} size="lg" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-lg text-slate-800 truncate max-w-md">{proj.originalName}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${isChecked ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {isChecked ? 'Checked' : 'Pending'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faClock} className="text-slate-300" />
                                                {new Date(proj.importDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-slate-200">|</span>
                                            <span>ID: {proj.id.toString().slice(-6)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-center ml-6">
                                    {/* --- ปุ่มควบคุมตามสถานะ (State Logic) --- */}
                                    {!isChecked ? (
                                        // ถ้ายังไม่ตรวจ: แสดงปุ่มเริ่มส่งตรวจ
                                        <button 
                                            disabled={checkingId === proj.id}
                                            onClick={() => handleRunCheck(proj)}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                                checkingId === proj.id 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95'
                                            }`}
                                        >
                                            <FontAwesomeIcon icon={faMagnifyingGlass} spin={checkingId === proj.id} />
                                            {checkingId === proj.id ? 'กำลังประมวลผล...' : 'เริ่มส่งตรวจ'}
                                        </button>
                                    ) : (
                                        // ถ้าตรวจเสร็จแล้ว: แสดงปุ่ม Recheck และปุ่มตรวจซ้ำ
                                        <>
                                            <button 
                                                onClick={() => handleRunCheck(proj)}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="ส่งตรวจใหม่อีกครั้ง"
                                            >
                                                <FontAwesomeIcon icon={faRotateRight} spin={checkingId === proj.id} />
                                            </button>
                                            <button 
                                                onClick={() => onSelectProject(proj)} 
                                                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2 active:scale-95"
                                            >
                                                <span>เปิดหน้า Recheck</span>
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
                        <p className="text-slate-400 text-sm mt-1">คลิกที่นี่เพื่อนำเข้าไฟล์ PDF ของนักศึกษาและเริ่มการตรวจสอบ</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;