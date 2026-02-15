import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSave,
  faRotateLeft,
  faGear,
  faCheckCircle,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const Settings = ({ onBack }) => {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      const data = await window.electronAPI.getConfig();
      if (data) setConfig(data);
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    const result = await window.electronAPI.saveConfig(config);
    if (result.success) {
      setStatus("success");
      setTimeout(() => setStatus(""), 3000);
    } else {
      alert("Error: " + result.error);
      setStatus("");
    }
  };

  if (!config)
    return <div className="p-10 text-slate-500">Loading Configuration...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FontAwesomeIcon icon={faGear} className="text-slate-400" />
            Validation Configuration
          </h1>
          <p className="text-slate-500 text-sm">
            ปรับแต่งค่าสำหรับการตรวจสอบเล่มปริญญานิพนธ์
          </p>
        </div>
        <button
          onClick={onBack}
          className="bg-slate-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={status === "success" ? faCheckCircle : faSave}
          />
          {status === "saving"
            ? "Saving..."
            : status === "success"
              ? "Saved!"
              : "Save Config"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Margin Settings --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-4 border-b pb-2">
            Page Margins (mm)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(config.margin_mm).map((key) => (
              <div key={key}>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {key}
                </label>
                <input
                  type="number"
                  value={config.margin_mm[key]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      margin_mm: {
                        ...config.margin_mm,
                        [key]: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border border-slate-200 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* --- Font Settings --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-700 mb-4 border-b pb-2">
            Font Rules
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Font Name
              </label>
              <input
                type="text"
                value={config.font.name}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    font: { ...config.font, name: e.target.value },
                  })
                }
                className="w-full border border-slate-200 rounded p-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Base Size
                </label>
                <input
                  type="number"
                  value={config.font.size}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      font: {
                        ...config.font,
                        size: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border border-slate-200 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Tolerance
                </label>
                <input
                  type="number"
                  value={config.font.tolerance}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      font: {
                        ...config.font,
                        tolerance: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border border-slate-200 rounded p-2 text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {/* --- Check List (Checkboxes) --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
          <h2 className="font-bold text-slate-700 mb-4 border-b pb-2">
            Enabled Checks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(config.check_list).map((key) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={config.check_list[key]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      check_list: {
                        ...config.check_list,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 group-hover:text-blue-600 transition-colors">
                  {key.replace(/_/g, " ").replace("check", "")}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* --- Indent Rules --- */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2">
          <h2 className="font-bold text-slate-700 mb-4 border-b pb-2">
            Indentation Rules (mm)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.keys(config.indent_rules).map((key) => (
              <div key={key}>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {key.replace(/_/g, " ")}
                </label>
                <input
                  type="number"
                  value={config.indent_rules[key]}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      indent_rules: {
                        ...config.indent_rules,
                        [key]: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full border border-slate-200 rounded p-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
