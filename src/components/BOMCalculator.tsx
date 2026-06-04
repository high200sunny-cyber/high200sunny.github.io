import React, { useState, useMemo } from 'react';
import { Group, Member, Project, BOMItem, PartListing, Expense } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Wrench, 
  Search, 
  RefreshCw, 
  Layers,
  ArrowRight,
  Info,
  Bell,
  Send,
  Copy,
  Mail,
  ExternalLink
} from 'lucide-react';

interface BOMCalculatorProps {
  activeGroup: Group;
  currentUser: Member;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  listings: PartListing[];
  setListings: React.Dispatch<React.SetStateAction<PartListing[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  toastMessage?: (msg: string) => void;
  permission: {
    canWrite: boolean;
    isAdmin: boolean;
    googleUser: any;
  };
  treasurerId: string;
  treasurerEmail: string;
  treasurerLineWebhook: string;
}

export default function BOMCalculator({
  activeGroup,
  currentUser,
  projects,
  setProjects,
  listings,
  setListings,
  setExpenses,
  toastMessage = () => {},
  permission,
  treasurerId,
  treasurerEmail,
  treasurerLineWebhook,
}: BOMCalculatorProps) {
  // Current active project
  const [activeProjId, setActiveProjId] = useState<string>('');

  const [isShowingNotificationModal, setIsShowingNotificationModal] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Editing / adding new BOM Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('結構五金');
  const [newRequiredQty, setNewRequiredQty] = useState('1');

  // Form to add a completely new Project
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Simulated inventory adjustments (key: project_id + bom_item_id => quantity)
  // This lets users dynamically increase/decrease inventory to recalculate shortages instantly!
  const [inventoryState, setInventoryState] = useState<Record<string, number>>({
    // Pre-populate some counts for high fidelity matching
    'proj-rm-1-bom-1': 2, // Required 4, short 2 (DJI M3508 is available in listings)
    'proj-rm-1-bom-2': 0, // Required 4, short 4 (C620 ESC is available in listings)
    'proj-rm-1-bom-3': 0, // Required 4, short 4 (Mecanum wheels needed)
    'proj-rm-1-bom-4': 0, // Required 1, short 1 (Arduino Mega needed)
    'proj-rm-1-bom-5': 1, // Required 1, ready
    'proj-rm-1-bom-6': 0, // Required 2, short 2

    'proj-fpv-1-bom-f1': 0, // Required 4 T-motor (Available in listings)
    'proj-fpv-1-bom-f2': 1, // Required 2, short 1
    'proj-fpv-1-bom-f3': 0, // Required 1, short 1 (Needed in listings)
  });

  const categories = ['電子電控', '動力與電機', '結構五金', '外殼材料', '智能傳感器', '其他'];

  // Keep active project matched to current group
  const groupProjects = useMemo(() => {
    const list = projects.filter((p) => p.groupId === activeGroup.id);
    // If current selected project doesn't belong to active group, reset selection
    if (list.length > 0 && (!activeProjId || !list.some((p) => p.id === activeProjId))) {
      setActiveProjId(list[0].id);
    }
    return list;
  }, [projects, activeGroup, activeProjId]);

  // Find the selected project object
  const selectedProject = useMemo(() => {
    return groupProjects.find((p) => p.id === activeProjId);
  }, [groupProjects, activeProjId]);

  // Adjust item inventory
  const handleAdjustInventory = (keyId: string, delta: number) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法變更裝配零件庫存！');
      return;
    }
    setInventoryState((prev) => {
      const cur = prev[keyId] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [keyId]: next };
    });
  };

  // Create a brand new project BOM skeleton
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，請先登入 Google 帳號，並聯絡管理員指派「學校社團」或「一般民眾」權限！');
      return;
    }
    if (!newProjName.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      groupId: activeGroup.id,
      name: newProjName.trim(),
      description: newProjDesc.trim() || '無詳細專案描述。',
      bomItems: [],
    };

    setProjects((prev) => [...prev, newProj]);
    setActiveProjId(newProj.id);
    setNewProjName('');
    setNewProjDesc('');
    setIsAddingProject(false);
    toastMessage(`🎉 成功創立新專案BOM單：「${newProj.name}」！`);
  };

  // Delete project
  const handleDeleteProject = (projId: string) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法刪除裝配專案！');
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    toastMessage('專案已成功刪除。');
  };

  // Add BOM item to active project
  const handleAddBOMItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，請先登入 Google 帳號，並聯絡管理員指派「學校社團」或「一般民眾」權限！');
      return;
    }
    if (!selectedProject || !newItemName.trim()) return;

    const qty = parseInt(newRequiredQty) || 1;
    const newBOM: BOMItem = {
      id: `bom-${Date.now()}`,
      partName: newItemName.trim(),
      category: newItemCat,
      requiredQty: qty,
    };

    // Update state
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selectedProject.id
          ? { ...p, bomItems: [...p.bomItems, newBOM] }
          : p
      )
    );

    // Set initial inventory state to 0 for this new item
    setInventoryState((prev) => ({
      ...prev,
      [`${selectedProject.id}-${newBOM.id}`]: 0,
    }));

    setNewItemName('');
    setNewRequiredQty('1');
    toastMessage(`成功新增BOM件：${newBOM.partName}`);
  };

  // Delete single BOM item
  const handleDeleteBOMItem = (itemId: string) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法刪除 BOM 進度項目！');
      return;
    }
    if (!selectedProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === selectedProject.id
          ? { ...p, bomItems: p.bomItems.filter((item) => item.id !== itemId) }
          : p
      )
    );
  };

  // Cross-reference with swap marketplace: search for available listings matching parts
  const findMatchesInMarketplace = (partName: string) => {
    return listings.filter(
      (l) =>
        l.groupId === activeGroup.id &&
        l.status === 'available' &&
        l.name.toLowerCase().includes(partName.toLowerCase())
    );
  };

  // Purchase directly from match to offset shortfall
  const handleFulfillFromMarket = (listing: PartListing, bomItemId: string, requiredFill: number) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法向隊友發起分攤購買調撥物料！');
      return;
    }
    // 1. Mark listing as exchanged
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, status: 'exchanged' } : l))
    );

    // 2. Add inventory locally to satisfy BOM
    const actuallyPurchasedQty = Math.min(listing.quantity, requiredFill);
    const key = `${selectedProject?.id}-${bomItemId}`;
    setInventoryState((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + actuallyPurchasedQty,
    }));

    // 3. Register as a custom shared expense
    const totalCost = listing.price * actuallyPurchasedQty;
    const newExpense: Expense = {
      id: `exp-bom-buy-${Date.now()}`,
      groupId: activeGroup.id,
      title: `【BOM補缺購入】${listing.name} (x${actuallyPurchasedQty})`,
      amount: totalCost,
      paidById: listing.ownerId,
      paidByName: listing.ownerName,
      splitWithIds: activeGroup.members.map((m) => m.id),
      date: new Date().toISOString(),
      category: '電子元器件',
    };

    setExpenses((prev) => [newExpense, ...prev]);
    toastMessage(
      `🛒 已購入「${listing.name}」x${actuallyPurchasedQty}！人均分攤 NT$ ${Math.round(
        totalCost / activeGroup.members.length
      )}，且 BOM 缺漏數已自動補齊！`
    );
  };

  // Calculator reports
  const bomReportSummary = useMemo(() => {
    if (!selectedProject || selectedProject.bomItems.length === 0) {
      return { totalItems: 0, readyItems: 0, shortItems: 0, estimatedShortfallCost: 0 };
    }

    let readyItems = 0;
    let shortItems = 0;
    let estimatedShortfallCost = 0;

    selectedProject.bomItems.forEach((item) => {
      const keyStr = `${selectedProject.id}-${item.id}`;
      const current = inventoryState[keyStr] || 0;
      const short = item.requiredQty - current;

      if (short <= 0) {
        readyItems++;
      } else {
        shortItems++;
        // Find if we have approximate unit price in listings or guess reference price
        const matches = findMatchesInMarketplace(item.partName);
        const refPrice = matches.length > 0 ? matches[0].price : 350; // default estimated price
        estimatedShortfallCost += short * refPrice;
      }
    });

    return {
      totalItems: selectedProject.bomItems.length,
      readyItems,
      shortItems,
      estimatedShortfallCost,
    };
  }, [selectedProject, inventoryState, listings]);

  // Compile parts shortage metrics dynamically for Treasurer / LINE Notify / Mail
  const compiledShortageReport = useMemo(() => {
    if (!selectedProject) return '';
    const timeStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) + ' (CST)';
    
    // Calculate details for each item in selectedProject
    const itemsLines = selectedProject.bomItems.map((item) => {
      const keyStr = `${selectedProject.id}-${item.id}`;
      const current = inventoryState[keyStr] || 0;
      const short = item.requiredQty - current;
      const hasShortage = short > 0;
      
      if (hasShortage) {
        // Look up marketplace matches for swapping
        const matches = findMatchesInMarketplace(item.partName);
        const matchInfo = matches.length > 0 
          ? `💡 平台市集配對：成員「${matches[0].ownerName}」有供應該零件 (價錢 NT$ ${matches[0].price} / 數量 ${matches[0].quantity} 個)`
          : '💡 平台市集配對：目前無市集隊友供應（建議發起外部採購，向群組通報人均公物分擔）';
        
        return ` • 【${item.partName}】(類別：${item.category})
   ➔ 專案裝配需求：${item.requiredQty} 個，現有庫存：${current} 個
   ⚠️ 缺量差：【 切實短缺 ${short} 個 】
   ${matchInfo}`;
      } else {
        return ` • 【${item.partName}】 ➔ 需求 ${item.requiredQty} 個 / 庫存 ${current} 個 【✅ 已備齊】`;
      }
    }).join('\n\n');

    return `🔧 【零配社團 - B.O.M 零件裝配缺口與採購對調分配備忘錄】
=================================
📅 報告時間：${timeStr}
👥 所屬社群：${activeGroup.name}
🏗️ 專案項目：${selectedProject.name}
📦 BOM 總件數：${bomReportSummary.totalItems} 項
✅ 備妥項目：${bomReportSummary.readyItems} 項
⚠️ 待補缺件：${bomReportSummary.shortItems} 項
💸 補缺預估成本：NT$ ${bomReportSummary.estimatedShortfallCost.toLocaleString()}

🔧 具體零件缺件清單與採購對調建議：
---------------------------------
${itemsLines}

=================================
👉 請財務長核實上述採購缺口與分配，進行撥補公款或採購對調！
(本採購通知由零配系統組裝缺件精算模組自動編譯)`;
  }, [selectedProject, inventoryState, listings, activeGroup, bomReportSummary]);

  const handleSendLineWebhook = async () => {
    if (!treasurerLineWebhook) {
      alert('⚠️ 尚未設定財務長 LINE Webhook 通道！系統已自動為您複製缺件報表，您可直接貼入 LINE 群組！');
      navigator.clipboard.writeText(compiledShortageReport);
      return;
    }

    setIsSendingWebhook(true);
    try {
      await fetch(treasurerLineWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: compiledShortageReport,
          timestamp: new Date().toISOString(),
          group: activeGroup.name,
          project: selectedProject?.name,
          treasurer: activeGroup.members.find(m => m.id === treasurerId)?.name,
          source: 'BOM 缺料精對帳與零件市集平衡系統'
        }),
        mode: 'no-cors'
      });
      toastMessage('🚀 LINE/Webhook 缺件報告已成功發送給財務長！');
    } catch (err: any) {
      toastMessage(`❌ 發送 Webhook 失敗，已自動複製到剪貼簿，原因: ${err.message}`);
      navigator.clipboard.writeText(compiledShortageReport);
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <div className="space-y-6" id="bom-calculator-tab">
      
      {/* Project selector bar & Creation triggers */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4" id="project-bar-shell">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Layers className="text-blue-400" size={18} />
          <span className="text-neutral-300 text-xs font-semibold mr-1">選擇硬體裝配專案：</span>
          <div className="flex flex-wrap gap-2">
            {groupProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProjId(p.id);
                  setIsAddingProject(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${activeProjId === p.id && !isAddingProject ? 'bg-blue-600 text-white font-semibold' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsAddingProject(true)}
          className="w-full lg:w-auto text-xs bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:text-blue-400 text-neutral-300 font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus size={13} />
          開立新 BOM 裝配案
        </button>
      </div>

      {/* Main core grids */}
      {isAddingProject ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-xl mx-auto" id="new-project-bom-form">
          <h3 className="text-neutral-100 font-semibold mb-4 text-sm flex items-center gap-2">
            🛠️ 創建全新的硬體裝配 BOM 單
          </h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                專案設備/組裝機名稱 *
              </label>
              <input
                type="text"
                required
                placeholder="例如：6S穿越無人機、農業開源澆水小塔"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                設備描述
              </label>
              <textarea
                rows={3}
                placeholder="簡短描述這個裝配目的、參賽規格或是主要使用的材料標準..."
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingProject(false)}
                className="flex-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-405 py-2 rounded-lg text-sm transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm shadow transition-colors cursor-pointer"
              >
                創立專案
              </button>
            </div>
          </form>
        </div>
      ) : selectedProject ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="bom-dashboard-workspace">
          
          {/* Left Columns - BOM Items Table and Shortage Analytics */}
          <div className="lg:col-span-2 space-y-6" id="left-bom-part">
            
            {/* Quick shortage computation alerts */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5" id="shortage-panel-insights">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-blue-400" />
                  <h3 className="text-neutral-100 font-medium text-sm">物料缺口精算面板 (Real-time Shortage)</h3>
                </div>
                <span className="text-[10px] text-neutral-500">專案: {selectedProject.name}</span>
              </div>

              {selectedProject.bomItems.length === 0 ? (
                <p className="text-neutral-500 text-xs py-2 text-center">
                  目前專案內尚無零件規劃，請在右側加入 BOM 所需材料項目！
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="insights-grid">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-neutral-500 font-sans">清單總件數</p>
                    <p className="text-xl font-bold text-neutral-200 mt-1">{bomReportSummary.totalItems} 項</p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-emerald-400 font-sans">件數充足</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{bomReportSummary.readyItems} 項</p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className={`text-[10px] font-sans ${bomReportSummary.shortItems > 0 ? 'text-rose-400' : 'text-neutral-450'}`}>
                      尚有缺件
                    </p>
                    <p className={`text-xl font-bold mt-1 ${bomReportSummary.shortItems > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
                      {bomReportSummary.shortItems} 項
                    </p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-blue-400 font-sans">預計補缺成本</p>
                    <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
                      NT$ {bomReportSummary.estimatedShortfallCost}
                    </p>
                  </div>
                </div>
              )}
            </div>

             {/* List of items table layout */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5" id="bom-items-grid-shell">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h4 className="text-neutral-100 text-xs font-semibold">零件配比規劃表</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span> 充足
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500 inline-block ml-2"></span> 缺件
                  </div>
                  {bomReportSummary.shortItems > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsShowingNotificationModal(true)}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 hover:scale-[1.01] transition-all text-neutral-950 font-bold rounded-lg text-xs cursor-pointer shadow-md shadow-blue-950/20"
                    >
                      <Bell size={11} />
                      📣 報送缺料通知財務長
                    </button>
                  )}
                </div>
              </div>

              {selectedProject.bomItems.length === 0 ? (
                <div className="text-center py-10" id="empty-table-prompt">
                  <p className="text-neutral-500 text-sm">此裝配案中沒有開立任何零件分錄。請使用右側表單指派新材料。</p>
                </div>
              ) : (
                <div className="overflow-x-auto" id="bom-table-viewport">
                  <table className="w-full text-left border-collapse" id="bom-materials-matrix">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500 text-xs font-sans">
                        <th className="py-2.5 px-3">材料名稱 (型號)</th>
                        <th className="py-2.5 px-3">材料類別</th>
                        <th className="py-2.5 px-3 text-center">需求數</th>
                        <th className="py-2.5 px-3 text-center">已有庫存</th>
                        <th className="py-2.5 px-3 text-center">目前狀態 / 交換檢查</th>
                        <th className="py-2.5 px-3 text-right">管理</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-350">
                      {selectedProject.bomItems.map((item) => {
                        const keyStr = `${selectedProject.id}-${item.id}`;
                        const current = inventoryState[keyStr] || 0;
                        const short = item.requiredQty - current;
                        const hasShortage = short > 0;

                        // Check swap pool listed matches
                        const matches = findMatchesInMarketplace(item.partName);

                        return (
                          <React.Fragment key={item.id}>
                            <tr className={`text-xs hover:bg-neutral-800/40 transition-colors ${hasShortage ? 'bg-rose-950/5 hover:bg-rose-950/10' : 'bg-emerald-950/5 hover:bg-emerald-950/10'}`}>
                              <td className="py-3 px-3 font-medium text-neutral-100">
                                {item.partName}
                              </td>
                              <td className="py-3 px-3 text-neutral-400">
                                <span className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] font-mono">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-semibold">
                                {item.requiredQty}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleAdjustInventory(keyStr, -1)}
                                    className="p-1 w-5 h-5 flex items-center justify-center rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-400 cursor-pointer border border-neutral-800"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-center w-6 font-bold">{current}</span>
                                  <button
                                    onClick={() => handleAdjustInventory(keyStr, 1)}
                                    className="p-1 w-5 h-5 flex items-center justify-center rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-400 cursor-pointer border border-neutral-800"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col items-center justify-center gap-1.5">
                                  {hasShortage ? (
                                    <span className="text-[11px] flex items-center gap-1 text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-full px-2.5 py-0.5 font-medium">
                                      <AlertTriangle size={11} />
                                      仍缺 {short} 件
                                    </span>
                                  ) : (
                                    <span className="text-[11px] flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded-full px-2.5 py-0.5 font-medium">
                                      <CheckCircle2 size={11} />
                                      已購妥
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteBOMItem(item.id)}
                                  className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg hover:bg-neutral-950 border border-transparent hover:border-neutral-850 transition-colors cursor-pointer"
                                  title="移除此BOM分錄"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>

                            {/* Collapsible helper row: If there is a shortage AND we found matches in the swap platform, show options */}
                            {hasShortage && matches.length > 0 && (
                              <tr className="bg-neutral-950/60">
                                <td colSpan={6} className="py-2.5 px-4 rounded border-b border-neutral-800">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-blue-950/40 to-neutral-900 border border-blue-900/30 rounded-lg p-2.5 text-xs">
                                    <div className="flex items-center gap-2 text-blue-400">
                                      <Search size={12} className="animate-pulse" />
                                      <span>
                                        <strong>市集現貨檢查：</strong> 找到同組成員「{matches[0].ownerName}」正有多餘的這款現貨可售 (x{matches[0].quantity}件)！價格為單件 NT${matches[0].price}。
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleFulfillFromMarket(matches[0], item.id, short)}
                                      className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 shadow-sm"
                                    >
                                      <ShoppingCart size={11} />
                                      一鍵購買 (幫社團平分)
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* General action guidance */}
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 rounded-lg p-3" id="proactive-bom-alert">
                <div className="flex items-center gap-2 text-neutral-450 text-xs">
                  <Info size={13} className="text-neutral-500 flex-shrink-0" />
                  <span>
                    <strong>零件調撥技巧：</strong> 當您一鍵購買其他隊友提供的零件時，系統會自動在「費用分攤」模組登錄該採購，並由整隊分帳，且將本專案的裝配庫存量調滿！
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (!permission.canWrite) {
                      alert('🔒 訪客唯讀模式，無法執行一鍵裝配模擬！');
                      return;
                    }
                    // Fast action: trigger mock supplier import of required shortages
                    setProjects((prev) =>
                      prev.map((p) => {
                        if (p.id !== selectedProject.id) return p;
                        return {
                          ...p,
                          bomItems: p.bomItems.map((item) => {
                            // Mock fulfillment for demonstration
                            const key = `${p.id}-${item.id}`;
                            setInventoryState((prevI) => ({
                              ...prevI,
                              [key]: item.requiredQty
                            }));
                            return item;
                          })
                        };
                      })
                    );
                    toastMessage('⚡ 快速裝配配給中！已模擬整隊物料到位！');
                  }}
                  className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-750 text-[11px] ml-auto pointer cursor-pointer shrink-0 transition-colors"
                >
                  一鍵模擬物料補齊
                </button>
              </div>
            </div>
          </div>

          {/* Right Columns - Create item form / details */}
          <div className="space-y-6" id="right-bom-calculator-form">
            
            {/* Form to add item to BOM */}
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-xl" id="new-item-to-bom-form">
              <h3 className="text-zinc-100 font-semibold mb-4 text-xs flex items-center gap-2">
                <Plus size={15} className="text-cyan-400" />
                登載新裝配零件進 BOM
              </h3>
              
              {!permission.canWrite && (
                <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-4 text-[11px] text-amber-400 leading-relaxed mb-4">
                  ⚠️ 您目前處於<strong>「訪客唯讀模式」</strong>。需要先登入 Google 帳號，並聯絡管理者審核啟用、指派「學校社團」或「一般民眾」權限，才可新增或管理專案材料。
                </div>
              )}

              <form onSubmit={handleAddBOMItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    指定零件/備件名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="請輸入零件品牌與完整型號"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      分類
                    </label>
                    <select
                      value={newItemCat}
                      onChange={(e) => setNewItemCat(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      計畫需求總件數 *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="如: 4"
                      value={newRequiredQty}
                      onChange={(e) => setNewRequiredQty(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!permission.canWrite}
                  className={`w-full font-semibold py-2 rounded-lg text-sm transition-colors ${
                    permission.canWrite 
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 cursor-pointer' 
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-750 cursor-not-allowed'
                  }`}
                >
                  {permission.canWrite ? '增列至專案清單' : '🔒 訪客唯讀 • 經由管理者授權'}
                </button>
              </form>
            </div>

            {/* Danger Zone: delete project */}
            <div className="bg-zinc-950 border border-rose-950/40 rounded-xl p-5" id="bom-danger-zone">
              <h4 className="text-zinc-400 font-medium text-xs mb-2">危險專區</h4>
              <p className="text-zinc-500 text-[10px] leading-relaxed mb-3">
                若本項專案材料與組裝工作已完全結束，您可以將其連同所有 BOM 分錄徹底刪除。此動作無法還原。
              </p>
              <button
                onClick={() => {
                  if (confirm(`確定要刪除「${selectedProject.name}」專案嗎？`)) {
                    handleDeleteProject(selectedProject.id);
                  }
                }}
                className="w-full bg-rose-950/20 hover:bg-rose-950 text-rose-400 border border-rose-900/30 hover:border-rose-900 py-1.5 rounded text-xs transition-colors cursor-pointer"
              >
                刪除此裝配專案BOM
              </button>
            </div>

          </div>

        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-xl" id="no-projects-overall">
          <p className="text-zinc-400 text-sm">目前此社團尚無建立任何硬體組裝專案。</p>
          <button
            onClick={() => setIsAddingProject(true)}
            className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-zinc-900 font-medium px-4 py-2 text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus size={12} />
            立即開立一個專案
          </button>
        </div>
      )}

      {/* 📣 B.O.M 缺料彙整通知財務長彈窗 */}
      <AnimatePresence>
        {isShowingNotificationModal && (
          <div className="fixed inset-0 z-55 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="text-blue-400" size={18} />
                  <h3 className="text-neutral-100 font-bold text-sm">📣 B.O.M 專案缺料即時彙報系統</h3>
                </div>
                <button 
                  onClick={() => setIsShowingNotificationModal(false)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs shrink-0 cursor-pointer"
                >
                  ✕ 關閉
                </button>
              </div>

              {/* Destination Details Header */}
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed text-neutral-400">
                <div>
                  <span className="text-neutral-500">📥 報送對象 (財務長)</span>
                  <p className="font-semibold text-neutral-200 mt-0.5">
                    {activeGroup.members.find(m => m.id === treasurerId)?.name || '未指派'} 
                    <span className="text-[10px] text-neutral-400 ml-1 bg-neutral-900 px-1 rounded">
                      ({treasurerEmail || '無信箱'})
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">🟢 LINE Webhook 自動傳輸</span>
                  <p className="font-semibold text-neutral-200 truncate mt-0.5" title={treasurerLineWebhook}>
                    {treasurerLineWebhook ? `已配置 (${treasurerLineWebhook})` : '未配置 (支援剪貼通報)'}
                  </p>
                </div>
              </div>

              {/* Live Preview Text area */}
              <p className="text-[11px] text-neutral-400 font-medium mb-1.5 pl-1">✨ 零件比對缺口報告預覽 (BOM Shortage Report Preview)：</p>
              <div className="flex-1 overflow-y-auto mb-4 bg-neutral-950 border border-neutral-850 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-blue-100 whitespace-pre-wrap select-all max-h-[40vh]">
                {compiledShortageReport}
              </div>

              <div className="text-[10px] text-neutral-500 mb-4 pl-1 leading-relaxed">
                💡 本功能為組裝公認好幫手！自動將目前專案缺件比對结果、人均公積金補缺預計、與市集配對交換名單一網打盡，提升社團運營及採購透明度。
              </div>

              {/* Interaction button rows */}
              <div className="flex flex-col sm:flex-row gap-2" id="bom-notifier-ctrl-row">
                <button
                  type="button"
                  onClick={handleSendLineWebhook}
                  disabled={isSendingWebhook}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-neutral-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow disabled:opacity-50"
                >
                  <Send size={13} />
                  {isSendingWebhook ? '傳輸中...' : '送出 LINE / Webhook 通知'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const mailLink = `mailto:${treasurerEmail}?subject=${encodeURIComponent(`【缺件通報】${activeGroup.name} - ${selectedProject?.name || '專案'} 零件缺口與對調補配單`)}&body=${encodeURIComponent(compiledShortageReport)}`;
                    window.open(mailLink, '_blank');
                    toastMessage('✉️ 成功開啟本機電子郵件，即將寄送缺件零件預算單。');
                  }}
                  className="flex-1 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-750 cursor-pointer"
                >
                  <Mail size={13} />
                  使用 Email 郵件寄件
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(compiledShortageReport);
                    toastMessage('📋 組裝補件報告與市集配對資料已成功複製！');
                  }}
                  className="bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-medium py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy size={13} />
                  複製缺件報告
                </button>

                <button
                  type="button"
                  onClick={() => setIsShowingNotificationModal(false)}
                  className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 py-2.5 px-4 rounded-lg text-xs cursor-pointer"
                >
                  關閉
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
