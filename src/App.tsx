import React, { useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_GROUPS, 
  INITIAL_PART_LISTINGS, 
  INITIAL_PROJECTS, 
  INITIAL_EXPENSES,
  loadFromLocalStorage,
  saveToLocalStorage 
} from './data';
import { Group, Member, PartListing, Project, Expense, UserBalance, UserProfile } from './types';
import ExpenseSharing from './components/ExpenseSharing';
import Marketplace from './components/Marketplace';
import BOMCalculator from './components/BOMCalculator';
import GroupManager from './components/GroupManager';
import { 
  DollarSign, 
  Package, 
  FolderGit2, 
  Users2, 
  TrendingUp, 
  Layers, 
  Coins, 
  Info,
  Calendar,
  AlertCircle,
  CheckCircle,
  Award,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  isFirebaseConfigured, 
  auth, 
  db, 
  googleSignIn, 
  googleSignOut, 
  dbSaveUser, 
  dbGetUser, 
  dbUpdateUserPermission, 
  dbDeleteRecord, 
  syncCollection 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  // --- Persistent State Initialization ---
  const [groups, setGroups] = useState<Group[]>(() => 
    loadFromLocalStorage('swap_platform_groups_v1', INITIAL_GROUPS)
  );
  
  const [activeGroup, setActiveGroup] = useState<Group>(() => {
    const savedGroups = loadFromLocalStorage<Group[]>('swap_platform_groups_v1', INITIAL_GROUPS);
    return savedGroups[0] || INITIAL_GROUPS[0];
  });

  const [currentUser, setCurrentUser] = useState<Member>(() => {
    return activeGroup.members[0] || INITIAL_GROUPS[0].members[0];
  });

  const [listings, setListings] = useState<PartListing[]>(() => 
    loadFromLocalStorage('swap_platform_listings_v1', INITIAL_PART_LISTINGS)
  );

  const [projects, setProjects] = useState<Project[]>(() => 
    loadFromLocalStorage('swap_platform_projects_v1', INITIAL_PROJECTS)
  );

  const [expenses, setExpenses] = useState<Expense[]>(() => 
    loadFromLocalStorage('swap_platform_expenses_v1', INITIAL_EXPENSES)
  );

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'expenses' | 'marketplace' | 'bom' | 'groups'>('expenses');

  // Interactive UI Toast Notifications
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  // --- Treasurer & Notification Settings ---
  const [treasurerId, setTreasurerId] = useState<string>(() => 
    loadFromLocalStorage('swap_platform_treasurer_id_v2', 'mem-ahao')
  );
  const [treasurerEmail, setTreasurerEmail] = useState<string>(() => 
    loadFromLocalStorage('swap_platform_treasurer_email_v2', 'high200sunny@gmail.com')
  );
  const [treasurerLineWebhook, setTreasurerLineWebhook] = useState<string>(() => 
    loadFromLocalStorage('swap_platform_treasurer_line_webhook_v2', '')
  );

  useEffect(() => {
    saveToLocalStorage('swap_platform_treasurer_id_v2', treasurerId);
  }, [treasurerId]);

  useEffect(() => {
    saveToLocalStorage('swap_platform_treasurer_email_v2', treasurerEmail);
  }, [treasurerEmail]);

  useEffect(() => {
    saveToLocalStorage('swap_platform_treasurer_line_webhook_v2', treasurerLineWebhook);
  }, [treasurerLineWebhook]);

  // --- Google & Firebase Authentication States ---
  const [currentAuthUser, setCurrentAuthUser] = useState<any>(() => {
    // If offline, check local storage for logged-in simulator user
    const saved = localStorage.getItem('swap_platform_current_auth_user_v1');
    return saved ? JSON.parse(saved) : null;
  });

  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => {
    const saved = loadFromLocalStorage<any[]>('swap_platform_registered_users_v1', [
      {
        uid: 'uid-admin-sunny',
        email: 'high200sunny@gmail.com',
        displayName: '王大明 Sunny (管理員)',
        photoURL: '',
        role: 'admin',
        status: 'approved',
        createdAt: new Date().toISOString()
      }
    ]);
    return saved;
  });

  // Subscribe to real Firebase if configured
  useEffect(() => {
    if (isFirebaseConfigured && auth && db) {
      // 1. Listen to Authentication State
      const unsubscribeAuth = onAuthStateChanged(auth, async (user: any) => {
        if (user) {
          const authObj = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Google User',
            photoURL: user.photoURL || ''
          };
          setCurrentAuthUser(authObj);
          
          // Self-register profile in Firestore if not existing
          const userDoc = await dbGetUser(user.uid);
          if (!userDoc) {
            const isDefaultAdmin = user.email === 'high200sunny@gmail.com';
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Google User',
              photoURL: user.photoURL || '',
              role: isDefaultAdmin ? 'admin' : 'visitor',
              status: isDefaultAdmin ? 'approved' : 'pending',
              createdAt: new Date().toISOString()
            };
            await dbSaveUser(newProfile);
          }
        } else {
          setCurrentAuthUser(null);
        }
      });

      // 2. Sync registered users list in real-time
      const unsubscribeUsers = syncCollection<any>('users', (data) => {
        // Guarantee at least pre-approved admin is represented
        const hasAdmin = data.some(u => u.email === 'high200sunny@gmail.com');
        if (!hasAdmin && data.length > 0) {
          // Keep it synced or append locally
        }
        setRegisteredUsers(data);
      });

      return () => {
        unsubscribeAuth();
        unsubscribeUsers();
      };
    }
  }, []);

  // Sync to local storage for simulator mode
  useEffect(() => {
    if (!isFirebaseConfigured) {
      localStorage.setItem('swap_platform_current_auth_user_v1', currentAuthUser ? JSON.stringify(currentAuthUser) : '');
    }
  }, [currentAuthUser]);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      saveToLocalStorage('swap_platform_registered_users_v1', registeredUsers);
    }
  }, [registeredUsers]);

  // Compute permission mapping
  const permission = useMemo(() => {
    if (!currentAuthUser) {
      return {
        canWrite: false, // Visitors who are not logged in are strictly read-only
        isAdmin: false,
        googleUser: null,
        role: 'visitor',
        status: 'pending'
      };
    }
    
    // Find user's role and status
    const profile = registeredUsers.find(u => u.email === currentAuthUser.email);
    if (!profile) {
      const isDefaultAdmin = currentAuthUser.email === 'high200sunny@gmail.com';
      return {
        canWrite: isDefaultAdmin,
        isAdmin: isDefaultAdmin,
        googleUser: currentAuthUser,
        role: isDefaultAdmin ? 'admin' : 'visitor',
        status: isDefaultAdmin ? 'approved' : 'pending'
      };
    }
    
    const isAdmin = profile.role === 'admin' || profile.email === 'high200sunny@gmail.com';
    const isApproved = profile.status === 'approved';
    const canWrite = isAdmin || (isApproved && (profile.role === 'school' || profile.role === 'public'));
    
    return {
      canWrite,
      isAdmin,
      googleUser: currentAuthUser,
      role: profile.role,
      status: profile.status
    };
  }, [currentAuthUser, registeredUsers]);

  // Authorization manipulation callbacks
  const handleUpdateUserRole = async (uid: string, role: string, status: string) => {
    if (isFirebaseConfigured) {
      await dbUpdateUserPermission(uid, role as any, status as any);
    } else {
      setRegisteredUsers((prev) => 
        prev.map((user) => user.uid === uid ? { ...user, role, status } : user)
      );
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (isFirebaseConfigured) {
      await dbDeleteRecord('users', uid);
    } else {
      setRegisteredUsers((prev) => prev.filter((user) => user.uid !== uid));
    }
  };

  const handleLoginCustom = async (email: string, name: string) => {
    if (isFirebaseConfigured) {
      try {
        await googleSignIn();
      } catch (err: any) {
        triggerToast(`登入失敗: ${err.message}`);
      }
    } else {
      // Offline mode simulator
      const targetEmail = email || 'high200sunny@gmail.com';
      const targetName = name || '王大明 Sunny';
      const simulatedUid = `sim-uid-${targetEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
      
      const newSimUser = {
        uid: simulatedUid,
        email: targetEmail,
        displayName: targetName,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${targetEmail}`
      };
      
      setRegisteredUsers((prev) => {
        if (prev.some(u => u.email === targetEmail)) {
          return prev;
        }
        const isDefaultAdmin = targetEmail === 'high200sunny@gmail.com';
        return [
          ...prev,
          {
            uid: simulatedUid,
            email: targetEmail,
            displayName: targetName,
            photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${targetEmail}`,
            role: isDefaultAdmin ? 'admin' : 'visitor',
            status: isDefaultAdmin ? 'approved' : 'pending',
            createdAt: new Date().toISOString()
          }
        ];
      });

      setCurrentAuthUser(newSimUser);
    }
  };

  const handleLogoutCustom = async () => {
    if (isFirebaseConfigured) {
      await googleSignOut();
    } else {
      setCurrentAuthUser(null);
    }
  };

  // --- Sync storage whenever states change ---
  useEffect(() => {
    saveToLocalStorage('swap_platform_groups_v1', groups);
  }, [groups]);

  useEffect(() => {
    saveToLocalStorage('swap_platform_listings_v1', listings);
  }, [listings]);

  useEffect(() => {
    saveToLocalStorage('swap_platform_projects_v1', projects);
  }, [projects]);

  useEffect(() => {
    saveToLocalStorage('swap_platform_expenses_v1', expenses);
  }, [expenses]);

  // Keep activeGroup in sync with modifications in groups list
  useEffect(() => {
    const fresh = groups.find((g) => g.id === activeGroup.id);
    if (fresh) {
      setActiveGroup(fresh);
      // Ensure currentUser still exists in this group, otherwise fallback
      if (!fresh.members.some((m) => m.id === currentUser.id)) {
        setCurrentUser(fresh.members[0] || INITIAL_GROUPS[0].members[0]);
      }
    }
  }, [groups, activeGroup.id]);

  // Helper trigger Toast
  const triggerToast = (message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  // --- Computed Analytics for Dashboard (Statistics Hub) ---
  const groupExpenses = useMemo(() => {
    return expenses.filter((e) => e.groupId === activeGroup.id);
  }, [expenses, activeGroup]);

  const groupListings = useMemo(() => {
    return listings.filter((l) => l.groupId === activeGroup.id);
  }, [listings, activeGroup]);

  const totalGroupSpent = useMemo(() => {
    return groupExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [groupExpenses]);

  // Expenditure distribution by individual members (horizontal progress bar visualizers)
  const spendByMember = useMemo(() => {
    return activeGroup.members.map((m) => {
      const sumPaid = groupExpenses
        .filter((e) => e.paidById === m.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        id: m.id,
        name: m.name,
        amount: sumPaid,
        color: m.avatarColor
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [groupExpenses, activeGroup]);

  const maxIndividualSpent = useMemo(() => {
    const max = Math.max(...spendByMember.map((s) => s.amount));
    return max > 0 ? max : 1;
  }, [spendByMember]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white" id="app-root">
      
      {/* Top Main Navigation Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-40 px-4 py-3 sm:px-6" id="main-header">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-md shadow-blue-900/10">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-neutral-100 flex items-center gap-1.5 font-sans">
                零配社團 <span className="text-neutral-500 font-normal">| 零件交換平台</span>
                <span className="text-[10px] bg-blue-950 border border-blue-850 text-blue-400 px-1.5 py-0.2 rounded font-mono">
                  v1.2
                </span>
              </h1>
              <p className="text-[10px] text-neutral-500 mt-0.5">即時統計對帳 • 裝配缺件管理 • 幾何平衡版</p>
            </div>
          </div>

          {/* Quick Global Context Indicators */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            
            {/* Active Group Selector */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="text-neutral-500">群組:</span>
              <select
                value={activeGroup.id}
                onChange={(e) => {
                  const target = groups.find((g) => g.id === e.target.value);
                  if (target) {
                    setActiveGroup(target);
                    // Automatic fallback simulated identity switch on group change
                    const match = target.members[0];
                    if (match) {
                      setCurrentUser(match);
                      triggerToast(`已移通至「${target.name}」群組。`);
                    }
                  }
                }}
                className="bg-transparent focus:outline-none cursor-pointer hover:text-blue-400 text-neutral-200 transition-colors max-w-40 font-medium text-ellipsis overflow-hidden"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-neutral-950 text-neutral-300 py-1">{g.name}</option>
                ))}
              </select>
            </div>

            {/* Simulated Active User Switcher */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} flex-shrink-0`} />
              <span className="text-neutral-400">登入ID:</span>
              <select
                value={currentUser.id}
                onChange={(e) => {
                  const match = activeGroup.members.find((m) => m.id === e.target.value);
                  if (match) {
                    setCurrentUser(match);
                    triggerToast(`操作身份已切換為：${match.name}`);
                  }
                }}
                className="bg-transparent focus:outline-none cursor-pointer hover:text-blue-400 text-neutral-200 transition-colors font-medium"
              >
                {activeGroup.members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-neutral-950 text-neutral-300">{m.name}</option>
                ))}
              </select>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6" id="main-content-area">
        
        {/* --- Persistent Google Authentication Status & Entry Banner --- */}
        {!permission.googleUser ? (
          <div className="bg-gradient-to-r from-blue-950/45 via-slate-900/40 to-neutral-900 border border-blue-800/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-blue-950/10 animate-in fade-in duration-300" id="global-login-banner">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-duration-1000"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-neutral-100 flex items-center gap-1.5 font-sans">
                  🔑 訪客唯讀模式（僅供瀏覽對帳）
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                  系統目前處於安全唯讀狀態。請使用下方按鈕進行驗證/模擬登入 Google，驗證通過指派身分後即可使用賬務申报、市集刊登和 BOM 自動對帳功能！
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={() => {
                  // Trigger login simulator/Google login Directly!
                  handleLoginCustom('', '');
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-neutral-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-950/20 transition-all font-sans"
              >
                <Mail size={13} />
                登入 / 註冊 Google 帳號
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow animate-in fade-in duration-200" id="global-loggedin-banner">
            <div className="flex items-center gap-3">
              <img 
                src={permission.googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${permission.googleUser.email}`} 
                alt="Google Avatar" 
                className="w-8 h-8 rounded-full border border-blue-500/50 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                  <span className="text-xs font-bold text-neutral-100 font-sans">{permission.googleUser.displayName} ({permission.googleUser.email})</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-95 origin-left ${
                    permission.role === 'admin' ? 'bg-amber-950 border border-amber-900/60 text-amber-400' :
                    permission.status === 'approved' ? 'bg-emerald-950 border border-emerald-900/60 text-emerald-400' : 'bg-red-950 border border-red-900/60 text-red-400'
                  }`}>
                    身分：{
                      permission.role === 'admin' ? '超級管理員 (Admin)' :
                      permission.role === 'school' ? '學校社團成員 (School)' :
                      permission.role === 'public' ? '自造民眾客 (Public)' : '一般訪客 (Visitor-Pending)'
                    } 【{permission.status === 'approved' ? '已核准發行' : '尚未核准，唯讀中'}】
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                  {permission.status === 'approved' 
                    ? `🟢 您已取得全功能寫入、刊登、對帳公務之完整權限。祝組裝順利！` 
                    : `⚠️ 目前身分待超級主控權 (high200sunny@gmail.com) 至「群組成員設定」啟用權益並指定權限等級。`
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={handleLogoutCustom}
                className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-750 text-neutral-350 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                title="登出目前 Google 帳號"
              >
                登出帳號
              </button>
            </div>
          </div>
        )}
        
        {/* Real-time Dynamic Analytics Infographics (即時數據統計面板與出資條形圖) */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 sm:p-6" id="dashboard-analytics-hud">
          <div className="flex flex-col md:flex-row items-stretch gap-6" id="hud-layout-grid">
            
            {/* Summary Left side: Numeric tallies */}
            <div className="md:w-1/3 flex flex-col justify-between gap-4" id="hud-left-tallies">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">社團總覽</span>
                <h2 className="text-neutral-100 font-bold text-sm mt-1">{activeGroup.name} 營運現況</h2>
                <p className="text-neutral-500 text-xs leading-relaxed mt-1">{activeGroup.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2" id="quick-data-tallies">
                <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-lg">
                  <p className="text-neutral-400 text-xs uppercase tracking-wider">社團累計支出</p>
                  <p className="text-3xl font-mono text-emerald-400 mt-1">
                    ${totalGroupSpent.toLocaleString()}
                  </p>
                </div>
                <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-lg">
                  <p className="text-neutral-400 text-xs uppercase tracking-wider">待交換件</p>
                  <p className="text-3xl font-mono text-blue-400 mt-1">
                    {groupListings.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Right side: Beautiful relative expense shares bar chart */}
            <div className="md:w-2/3 border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between" id="hud-right-bar-chart">
              <div>
                <h3 className="text-neutral-300 text-xs font-semibold flex items-center gap-1.5 mb-3">
                  <TrendingUp size={13} className="text-blue-500" />
                  成員出資貢獻比率 (實付排名) - 即時總金額
                </h3>
                
                <div className="space-y-3" id="hud-contributions-barlist">
                  {spendByMember.map((memberSpend) => {
                    const pct = (memberSpend.amount / maxIndividualSpent) * 100;
                    return (
                      <div key={memberSpend.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${memberSpend.color}`} />
                            {memberSpend.name}
                          </span>
                          <span className="text-neutral-400 font-mono font-semibold">
                            NT$ {memberSpend.amount.toLocaleString()} 
                            <span className="text-[10px] text-neutral-500 ml-1.5">
                              ({totalGroupSpent > 0 ? Math.round((memberSpend.amount / totalGroupSpent) * 100) : 0}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-850">
                          <motion.div 
                            className="bg-blue-600 h-full rounded-full" 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 text-neutral-500 text-[10px] flex items-center gap-1 border-t border-neutral-800 pt-2 bg-transparent">
                <Info size={11} />
                <span>結算中心公帳系統：根據即時統計最優化分攤，大幅減少多餘對帳與匯款往返。</span>
              </div>
            </div>

          </div>
        </section>

        {/* Modular Navigation Tabs (簡潔且現代感的導航控制) */}
        <nav className="flex bg-neutral-900 rounded-xl p-1 relative z-25 border border-neutral-800" id="modular-navigation-tab-bar">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-neutral-950 text-blue-400 border border-neutral-800/80 shadow'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-950/40'
            }`}
          >
            <DollarSign size={16} />
            社團費用分攤
          </button>
          
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'marketplace'
                ? 'bg-neutral-950 text-blue-400 border border-neutral-800/80 shadow'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-950/40'
            }`}
          >
            <Package size={16} />
            零件交換市集
          </button>

          <button
            onClick={() => setActiveTab('bom')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'bom'
                ? 'bg-neutral-950 text-blue-400 border border-neutral-800/80 shadow'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-950/40'
            }`}
          >
            <FolderGit2 size={16} />
            B.O.M 缺件比對
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-neutral-950 text-blue-400 border border-neutral-800/80 shadow'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-950/40'
            }`}
          >
            <Users2 size={16} />
            群組成員設定
          </button>
        </nav>

        {/* Content switch area governed by state */}
        <section className="min-h-[400px] relative z-20" id="tab-content-renderer">
          {activeTab === 'expenses' && (
            <ExpenseSharing
              activeGroup={activeGroup}
              currentUser={currentUser}
              expenses={expenses}
              setExpenses={setExpenses}
              permission={permission}
              treasurerId={treasurerId}
              treasurerEmail={treasurerEmail}
              treasurerLineWebhook={treasurerLineWebhook}
              toastMessage={triggerToast}
            />
          )}

          {activeTab === 'marketplace' && (
            <Marketplace
              activeGroup={activeGroup}
              currentUser={currentUser}
              listings={listings}
              setListings={setListings}
              setExpenses={setExpenses}
              toastMessage={triggerToast}
              permission={permission}
            />
          )}

          {activeTab === 'bom' && (
            <BOMCalculator
              activeGroup={activeGroup}
              currentUser={currentUser}
              projects={projects}
              setProjects={setProjects}
              listings={listings}
              setListings={setListings}
              setExpenses={setExpenses}
              toastMessage={triggerToast}
              permission={permission}
              treasurerId={treasurerId}
              treasurerEmail={treasurerEmail}
              treasurerLineWebhook={treasurerLineWebhook}
            />
          )}

          {activeTab === 'groups' && (
            <GroupManager
              groups={groups}
              setGroups={setGroups}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              toastMessage={triggerToast}
              permission={permission}
              registeredUsers={registeredUsers}
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              onLoginCustom={handleLoginCustom}
              onLogoutCustom={handleLogoutCustom}
              isFirebaseConnected={isFirebaseConfigured}
              treasurerId={treasurerId}
              setTreasurerId={setTreasurerId}
              treasurerEmail={treasurerEmail}
              setTreasurerEmail={setTreasurerEmail}
              treasurerLineWebhook={treasurerLineWebhook}
              setTreasurerLineWebhook={setTreasurerLineWebhook}
            />
          )}
        </section>

      </main>

      {/* Footer system details */}
      <footer className="border-t border-neutral-905 bg-neutral-950 mt-16 py-6 px-4 text-center text-xs text-neutral-500 space-y-2" id="app-footer">
        <p>© 2026 零件交換與帳務分攤平台 - 幾何平衡社群工具</p>
        <p className="font-mono text-[10px] text-neutral-600">
          系統微秒級帳務精算 • 支援 UTF-8 繁體中文編碼 • 計算狀態：正常 
        </p>
      </footer>

      {/* System Toast overlay notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-xl shadow-2xl p-4 max-w-sm flex items-start gap-3"
            id="system-notification-toast"
          >
            <div className="w-5 h-5 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle size={14} />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-200">系統即時訊息</p>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
