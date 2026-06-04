import React, { useState, useMemo } from 'react';
import { Group, Member, Expense, Settlement, UserBalance } from '../types';
import { 
  DollarSign, 
  User, 
  Calendar, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Users, 
  PiggyBank, 
  CreditCard, 
  Percent, 
  CheckCircle2, 
  TrendingUp, 
  ChevronDown,
  Bell,
  Send,
  Copy,
  ExternalLink,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExpenseSharingProps {
  activeGroup: Group;
  currentUser: Member;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  permission: {
    canWrite: boolean;
    isAdmin: boolean;
    googleUser: any;
  };
  treasurerId: string;
  treasurerEmail: string;
  treasurerLineWebhook: string;
  toastMessage: (msg: string) => void;
}

export default function ExpenseSharing({
  activeGroup,
  currentUser,
  expenses,
  setExpenses,
  permission,
  treasurerId,
  treasurerEmail,
  treasurerLineWebhook,
  toastMessage,
}: ExpenseSharingProps) {
  // Screen views and form opening states
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const [isShowingNotificationModal, setIsShowingNotificationModal] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Form input states
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidById, setPaidById] = useState(currentUser.id);
  const [splitWithIds, setSplitWithIds] = useState<string[]>(
    activeGroup.members.map((m) => m.id)
  );
  const [category, setCategory] = useState('一般耗材');

  // Multi-group categories default
  const categories = ['結構打樣', '電子元器件', '動力電池', '耗材場地', '加工費', '公共設備', '一般耗材', '其他'];

  // Current group filter
  const groupExpenses = useMemo(() => {
    return expenses.filter((e) => e.groupId === activeGroup.id);
  }, [expenses, activeGroup]);

  // Expenses filtering
  const filteredExpenses = useMemo(() => {
    return groupExpenses.filter((e) => {
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      const matchSearch = e.title.toLowerCase().includes(searchText.toLowerCase()) || e.paidByName.toLowerCase().includes(searchText.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [groupExpenses, filterCategory, searchText]);

  // Balance calculation
  const balances = useMemo<UserBalance[]>(() => {
    const mems = activeGroup.members;
    const balanceMap: Record<string, { paid: number; share: number }> = {};
    
    mems.forEach((m) => {
      balanceMap[m.id] = { paid: 0, share: 0 };
    });

    groupExpenses.forEach((exp) => {
      // Add paid amount
      if (balanceMap[exp.paidById]) {
        balanceMap[exp.paidById].paid += exp.amount;
      }

      // Add split share amount
      const sharersCount = exp.splitWithIds.length;
      if (sharersCount > 0) {
        const shareAmount = exp.amount / sharersCount;
        exp.splitWithIds.forEach((sid) => {
          if (balanceMap[sid]) {
            balanceMap[sid].share += shareAmount;
          }
        });
      }
    });

    return mems.map((m) => {
      const data = balanceMap[m.id] || { paid: 0, share: 0 };
      const net = data.paid - data.share;
      return {
        memberId: m.id,
        memberName: m.name,
        paidAmount: Math.round(data.paid),
        shareAmount: Math.round(data.share),
        netBalance: Math.round(net),
      };
    });
  }, [groupExpenses, activeGroup]);

  // Settlement calculations (Greedy algorithm to minimize transactions)
  const settlements = useMemo<Settlement[]>(() => {
    const netBalances = balances.map((b) => ({
      id: b.memberId,
      name: b.memberName,
      balance: b.netBalance,
    }));

    const debtors = netBalances
      .filter((b) => b.balance < -1)
      .sort((a, b) => a.balance - b.balance); // Most negative first (owes most)
    
    const creditors = netBalances
      .filter((b) => b.balance > 1)
      .sort((a, b) => b.balance - a.balance); // Most positive first (receives most)

    const list: Settlement[] = [];

    let dIdx = 0;
    let cIdx = 0;

    // Deep copy and round
    const owedList = debtors.map((d) => ({ ...d, amountOwed: Math.abs(d.balance) }));
    const receiveList = creditors.map((c) => ({ ...c, amountDue: c.balance }));

    while (dIdx < owedList.length && cIdx < receiveList.length) {
      const debtor = owedList[dIdx];
      const creditor = receiveList[cIdx];

      const minSettle = Math.min(debtor.amountOwed, creditor.amountDue);

      if (minSettle > 0.5) {
        list.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: Math.round(minSettle),
        });
      }

      debtor.amountOwed -= minSettle;
      creditor.amountDue -= minSettle;

      if (debtor.amountOwed <= 0.5) {
        dIdx++;
      }
      if (creditor.amountDue <= 0.5) {
        cIdx++;
      }
    }

    return list;
  }, [balances]);

  // Total Group Spent
  const totalSpent = useMemo(() => {
    return groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [groupExpenses]);

  // Compile the elegant text report dynamically for Mail / LINE group dispatch
  const compiledFinancialReport = useMemo(() => {
    const timeStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) + ' (CST)';
    
    // Member contributions lines
    const memberDetails = balances.map((b) => {
      const pct = totalSpent > 0 ? Math.round((b.paidAmount / totalSpent) * 100) : 0;
      return ` • 【${b.memberName}】：實付 NT$ ${b.paidAmount.toLocaleString()} (${pct}%)`;
    }).join('\n');

    // Settlement lines
    const settlementDetails = settlements.length > 0 
      ? settlements.map((s) => ` • ${s.fromName} 💳 應匯款給 ${s.toName} ➔ NT$ ${s.amount.toLocaleString()}`).join('\n')
      : ' • 🎉 目前帳目平衡，無任何需要協調匯款的分攤與欠額！';

    return `📢 【零配社團 - 財務長即時對帳通知】
=================================
📅 匯出時間：${timeStr}
👥 對帳社群：${activeGroup.name}
💰 社團累計公帳支出：NT$ ${totalSpent.toLocaleString()}
📝 登載總分攤：共 ${groupExpenses.length} 筆門戶明細

👤 成員實付出資貢獻比例：
---------------------------------
${memberDetails}

✏️ 最佳化平衡結算指引 (應支付/應收明細)：
---------------------------------
${settlementDetails}

=================================
👉 請財務長核實對帳單，並於 LINE 社群發出對數公告！
(本對帳單由零配社團公用財務系統自動彙整編譯)`;
  }, [balances, totalSpent, groupExpenses, settlements, activeGroup]);

  const handleSendLineWebhook = async () => {
    if (!treasurerLineWebhook) {
      alert('⚠️ 您尚未設定財務長 LINE Webhook！系統已自動為您複製對帳報表，請直接貼到 LINE 社群！');
      navigator.clipboard.writeText(compiledFinancialReport);
      toastMessage('📋 財務對帳明細已成功複製到剪貼簿！');
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
          message: compiledFinancialReport,
          timestamp: new Date().toISOString(),
          group: activeGroup.name,
          treasurer: activeGroup.members.find(m => m.id === treasurerId)?.name || '未指定',
          source: '零件交換與對帳精算平台'
        }),
        mode: 'no-cors'
      });
      toastMessage('🚀 LINE/Webhook 財務報對帳對數通知已送往財務長伺服器！');
    } catch (err: any) {
      toastMessage(`❌ 發送 Webhook 失敗，已自動複製到剪貼簿備份，原因: ${err.message}`);
      navigator.clipboard.writeText(compiledFinancialReport);
    } finally {
      setIsSendingWebhook(false);
    }
  };

  // Quick helper to fetch member name
  const getMemberName = (id: string) => {
    return activeGroup.members.find((m) => m.id === id)?.name || '未知成員';
  };

  // Add a new expense
  const handleAddNewExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，請先登入 Google 帳號，並聯絡管理員指派「學校社團」或「一般民眾」權限！');
      return;
    }
    const parsedAmount = parseFloat(amountStr);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    if (splitWithIds.length === 0) {
      alert('請至少選擇一位分攤成員！');
      return;
    }

    const payer = activeGroup.members.find((m) => m.id === paidById);
    if (!payer) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      groupId: activeGroup.id,
      title: title.trim(),
      amount: parsedAmount,
      paidById,
      paidByName: payer.name,
      splitWithIds,
      date: new Date().toISOString(),
      category,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Reset form
    setTitle('');
    setAmountStr('');
    setPaidById(currentUser.id);
    setSplitWithIds(activeGroup.members.map((m) => m.id));
    setIsAddingExpense(false);
  };

  // Delete an expense
  const handleDeleteExpense = (id: string) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法執行刪除操作！');
      return;
    }
    setExpenses((prev) => prev.filter((exp) => exp.id !== id));
  };

  const toggleSelectAllSharers = () => {
    if (splitWithIds.length === activeGroup.members.length) {
      setSplitWithIds([]);
    } else {
      setSplitWithIds(activeGroup.members.map((m) => m.id));
    }
  };

  const handleToggleSharer = (id: string) => {
    setSplitWithIds((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6" id="expenses-sharing-tab">
      {/* Real-time stats header / cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="accounting-summary-grid">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden" id="card-total-group-spent">
          <div className="absolute right-3 top-3 opacity-10">
            <TrendingUp size={48} className="text-blue-400" />
          </div>
          <p className="text-neutral-400 text-xs font-medium tracking-wider uppercase">群組累計支出</p>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-neutral-100">NT$ {totalSpent.toLocaleString()}</span>
            <span className="ml-2 text-xs text-neutral-500">共 {groupExpenses.length} 筆款項</span>
          </div>
          <div className="mt-3 text-xs text-neutral-400 flex items-center gap-1.5 border-t border-neutral-800/60 pt-3">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>即時數據更新</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden" id="card-current-member-balance">
          <div className="absolute right-3 top-3 opacity-10">
            <PiggyBank size={48} className="text-emerald-400" />
          </div>
          <p className="text-neutral-400 text-xs font-medium tracking-wider uppercase">您 ({currentUser.name}) 的當前狀態</p>
          {(() => {
            const myBal = balances.find((b) => b.memberId === currentUser.id);
            const net = myBal?.netBalance || 0;
            return (
              <>
                <div className="mt-2 flex items-baseline">
                  <span className={`text-2xl font-mono font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {net >= 0 ? `+NT$ ${net.toLocaleString()}` : `-NT$ ${Math.abs(net).toLocaleString()}`}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {net >= 0 ? '應收回' : '應支付'}
                  </span>
                </div>
                <div className="mt-3 text-xs text-neutral-400 flex justify-between border-t border-neutral-800/60 pt-3">
                  <span>付款：${myBal?.paidAmount.toLocaleString() || 0}</span>
                  <span>應分攤：${myBal?.shareAmount.toLocaleString() || 0}</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden" id="card-active-settlement-actions">
          <div className="absolute right-3 top-3 opacity-10">
            <CheckCircle2 size={48} className="text-blue-400" />
          </div>
          <p className="text-neutral-400 text-xs font-medium tracking-wider uppercase">待協調結算筆數</p>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl font-mono font-bold text-neutral-100">{settlements.length} 筆</span>
            <span className="ml-2 text-xs text-neutral-500">可最小化匯款路徑</span>
          </div>
          <div className="mt-3 text-xs text-blue-400 flex items-center gap-1 border-t border-neutral-800/60 pt-3">
            <span>最佳化結算公式已套用</span>
          </div>
        </div>
      </div>

      {/* Main ledger and settlement split layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="expense-workspace">
        
        {/* Left side column: Bills and Settlements */}
        <div className="lg:col-span-2 space-y-6" id="left-expense-column">
          
          {/* Realtime Debts Path (帳務清算指引) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6" id="creditors-debtors-flow">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3" id="settlement-header">
              <div className="flex items-center gap-2">
                <Users className="text-blue-400" size={20} />
                <h3 className="text-neutral-100 font-medium text-xs sm:text-sm">即時社團帳務協調與分攤對帳單</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs bg-neutral-850 text-neutral-400 px-2.5 py-1 rounded-full font-mono border border-neutral-800/60">
                  最小化匯款精算
                </span>
                <button
                  onClick={() => setIsShowingNotificationModal(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 hover:scale-[1.01] transition-all text-neutral-950 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-md shadow-blue-950/20"
                >
                  <Bell size={13} />
                  📣 撥報對帳通知財務長
                </button>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 flex flex-col items-center justify-center gap-2" id="no-debt-notification">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="text-sm">大家的帳務完全平衡！目前不需要協調分攤匯款。</p>
              </div>
            ) : (
              <div className="space-y-3" id="settlement-path-list">
                {settlements.map((settle, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-950/60 border border-rose-900 text-rose-400 font-medium text-xs">
                        {settle.fromName[0]}
                      </div>
                      <span className="text-neutral-300 font-medium text-sm">{settle.fromName}</span>
                      
                      <div className="flex items-center text-neutral-600 gap-1 mx-1.5">
                        <span className="text-xs font-mono font-light">支付</span>
                        <ArrowRight size={14} className="text-neutral-500" />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-medium text-xs">
                          {settle.toName[0]}
                        </div>
                        <span className="text-neutral-300 font-medium text-sm">{settle.toName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 self-stretch sm:self-center">
                      <div className="bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-right">
                        <span className="text-xs text-neutral-500 font-sans mr-2">拆分金額</span>
                        <span className="text-sm font-mono font-bold text-blue-400">NT$ {settle.amount}</span>
                      </div>
                      <button 
                        onClick={() => {
                          // Fast action: record a simulated refund transaction
                          const settleExpense: Expense = {
                            id: `settle-${Date.now()}`,
                            groupId: activeGroup.id,
                            title: `【帳務結算】${settle.fromName} 支付給 ${settle.toName}`,
                            amount: settle.amount,
                            paidById: settle.fromId,
                            paidByName: settle.fromName,
                            splitWithIds: [settle.toId], // Spreads to specific person to offset
                            date: new Date().toISOString(),
                            category: '帳務清算',
                          };
                          setExpenses((prev) => [settleExpense, ...prev]);
                        }}
                        className="text-xs bg-neutral-800 hover:bg-neutral-750 hover:text-white text-neutral-300 border border-neutral-750 rounded px-2 md:px-3 py-1.5 flex items-center gap-1 transition-all cursor-pointer font-medium"
                      >
                        已完成匯款
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Individual accounts cards details */}
            <div className="mt-5 border-t border-neutral-800/60 pt-4" id="member-balance-breakdown">
              <h4 className="text-xs text-neutral-400 mb-2.5 font-medium flex items-center gap-1.5">
                <Users size={12} />
                成員出資明細：
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {balances.map((b) => (
                  <div key={b.memberId} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-center">
                    <p className="text-neutral-400 text-xs truncate max-w-full font-medium">{b.memberName}</p>
                    <p className="text-sm font-bold font-mono mt-1 text-neutral-200">
                      ${b.paidAmount.toLocaleString()}
                    </p>
                    <p className={`text-[10px] font-mono mt-0.5 ${b.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {b.netBalance >= 0 ? `+${b.netBalance}` : b.netBalance}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Master bill history list */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6" id="bill-history-module">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6" id="ledgers-top-actions">
              <h3 className="text-neutral-100 font-medium text-base">社團採購與費用明細</h3>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="搜尋帳目、付款人..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-600 w-full sm:w-40 transition-colors"
                />
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-400 focus:outline-none cursor-pointer hover:border-neutral-700 transition-colors"
                >
                  <option value="all">所有類別</option>
                  <option value="帳務清算">帳務清算</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-800 bg-neutral-950/20 rounded-xl" id="no-expenses-view">
                <p className="text-neutral-500 text-sm">找不到符合篩選條件的帳目。快去新增第一筆支出吧！</p>
              </div>
            ) : (
              <div className="space-y-3" id="expenses-timeline">
                {filteredExpenses.map((exp) => (
                  <div 
                    key={exp.id} 
                    className="bg-neutral-950/60 hover:bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-400">
                        {exp.category === '帳務清算' ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <DollarSign size={16} className="text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-neutral-100">{exp.title}</span>
                          <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-mono">
                            {exp.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-neutral-200">{exp.paidByName}</span> 付款
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {exp.category === '帳務清算' ? (
                              `已沖銷 ${getMemberName(exp.splitWithIds[0])} 的欠額`
                            ) : (
                              `${exp.splitWithIds.length} 人分攤 (${exp.splitWithIds.map(getMemberName).join(', ')})`
                            )}
                          </span>
                          <span>•</span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(exp.date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 border-neutral-900 pt-3 sm:pt-0">
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-neutral-100">
                          NT$ {exp.amount.toLocaleString()}
                        </p>
                        {exp.category !== '帳務清算' && (
                          <p className="text-[10px] text-neutral-500 mt-0.5 font-sans">
                            人均 NT$ {Math.round(exp.amount / (exp.splitWithIds.length || 1))}
                          </p>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 hover:bg-neutral-900 text-neutral-500 hover:text-red-400 rounded-lg border border-transparent hover:border-neutral-800 transition-colors cursor-pointer"
                        title="刪除帳目"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side form: Add expense */}
        <div className="space-y-6" id="right-expense-column">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl sticky top-4" id="accounting-form">
            <h3 className="text-neutral-100 font-semibold mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-400" />
              刊登採購 / 申報社團支出
            </h3>

            {!permission.canWrite && (
              <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-4 text-xs text-amber-400 leading-relaxed mb-4">
                ⚠️ 您目前處於<strong>「訪客唯讀模式」</strong>。您可以瀏覽社團帳目，但需要先登入 Google 帳號，並聯絡管理者 (high200sunny@gmail.com) 審核啟用、指派「學校社團」或「一般民眾」權限，才可新增或管理費用分攤。
              </div>
            )}

            <form onSubmit={handleAddNewExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  支出項目 / 購買材料名稱 *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="例如：3D列印高強度耗材、五金件" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    總金額 (TWD) *
                  </label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="輸入實付金額" 
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    耗材類別
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 cursor-pointer text-neutral-300"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  誰先付款的？
                </label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 cursor-pointer text-neutral-200"
                >
                  {activeGroup.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name === currentUser.name ? `${m.name} (您自己)` : m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-neutral-400">
                    分攤對象
                  </label>
                  <button 
                    type="button"
                    onClick={toggleSelectAllSharers}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    {splitWithIds.length === activeGroup.members.length ? '全部取消' : '整組全分攤'}
                  </button>
                </div>
                
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto font-sans" id="sharer-selector-box">
                  {activeGroup.members.map((m) => (
                    <label 
                      key={m.id} 
                      className="flex items-center justify-between cursor-pointer text-xs select-none hover:bg-neutral-900/40 p-1 rounded pr-2"
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={splitWithIds.includes(m.id)}
                          onChange={() => handleToggleSharer(m.id)}
                          className="rounded border-neutral-800 bg-neutral-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span className="text-neutral-200">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {splitWithIds.includes(m.id) && !isNaN(parseFloat(amountStr)) && parseFloat(amountStr) > 0 ? (
                          `$${Math.round(parseFloat(amountStr) / (splitWithIds.length || 1))}`
                        ) : (
                          '$0'
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!permission.canWrite}
                className={`w-full font-bold rounded-lg text-sm px-4 py-2.5 flex items-center justify-center gap-2 shadow-md transition-colors ${
                  permission.canWrite 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-950/10' 
                    : 'bg-neutral-800 border border-neutral-750 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {permission.canWrite ? '申報此筆分攤支出' : '🔒 訪客唯讀 • 經由管理者授權'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 📣 彙編對帳報表通知財務長互動彈窗 */}
      <AnimatePresence>
        {isShowingNotificationModal && (
          <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <h3 className="text-neutral-100 font-bold text-sm">📣 彙編群組對帳報表 — 發送通知儀表板</h3>
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
                  <span className="text-neutral-500">📥 通知對象 (財務長)</span>
                  <p className="font-semibold text-neutral-200 mt-0.5">
                    {activeGroup.members.find(m => m.id === treasurerId)?.name || '未指派'} 
                    <span className="text-[10px] text-neutral-400 ml-1 bg-neutral-900 px-1 rounded">
                      ({treasurerEmail || '無郵件'})
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">🟢 LINE Webhook 自動傳輸</span>
                  <p className="font-semibold text-neutral-200 truncate mt-0.5" title={treasurerLineWebhook}>
                    {treasurerLineWebhook ? `已配置 (${treasurerLineWebhook})` : '未配置（將採本地剪貼對帳）'}
                  </p>
                </div>
              </div>

              {/* Live Preview Text area */}
              <p className="text-[11px] text-neutral-400 font-medium mb-1.5 pl-1">✨ 即時報表精算預覽 (Format Preview)：</p>
              <div className="flex-1 overflow-y-auto mb-4 bg-neutral-950 border border-neutral-850 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-blue-100 whitespace-pre-wrap select-all max-h-[40vh]">
                {compiledFinancialReport}
              </div>

              <div className="text-[10px] text-neutral-500 mb-4 pl-1 leading-relaxed">
                💡 本系統支援多元對話渠道發送：可用 Webhook 直接將訊息打入 LINE，或一鍵叫出郵件發送信件給財務長，亦可手動一鍵複製全內容直接貼入口語群阻。
              </div>

              {/* Interaction button rows */}
              <div className="flex flex-col sm:flex-row gap-2" id="notification-interaction-btns">
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
                    const mailLink = `mailto:${treasurerEmail}?subject=${encodeURIComponent(`【零配社團對帳】${activeGroup.name} 即時費用總覽`)}&body=${encodeURIComponent(compiledFinancialReport)}`;
                    window.open(mailLink, '_blank');
                    toastMessage('✉️ 成功召喚電子郵件，即將寄送對帳報表。');
                  }}
                  className="flex-1 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all border border-neutral-750 cursor-pointer"
                >
                  <Mail size={13} />
                  使用 Email 郵件寄件
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(compiledFinancialReport);
                    toastMessage('📋 對帳明細與平衡指引已複製到剪貼簿！');
                  }}
                  className="bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-medium py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Copy size={13} />
                  複製文字
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
