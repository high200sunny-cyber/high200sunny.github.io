import React, { useState } from 'react';
import { Group, Member } from '../types';
import { 
  Users, 
  Plus, 
  UserPlus, 
  RefreshCw, 
  Pocket, 
  CheckCircle, 
  UserCheck, 
  ArrowRight,
  Sparkles,
  Info,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Lock,
  LogOut,
  Mail,
  User,
  Bell,
  ExternalLink
} from 'lucide-react';

interface GroupManagerProps {
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  activeGroup: Group;
  setActiveGroup: (g: Group) => void;
  currentUser: Member;
  setCurrentUser: (m: Member) => void;
  toastMessage?: (msg: string) => void;
  permission: {
    canWrite: boolean;
    isAdmin: boolean;
    googleUser: any;
    role: string;
    status: string;
  };
  registeredUsers: any[];
  onUpdateUserRole: (uid: string, role: string, status: string) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  onLoginCustom: (email: string, name: string) => void;
  onLogoutCustom: () => void;
  isFirebaseConnected: boolean;
  treasurerId: string;
  setTreasurerId: (id: string) => void;
  treasurerEmail: string;
  setTreasurerEmail: (email: string) => void;
  treasurerLineWebhook: string;
  setTreasurerLineWebhook: (webhook: string) => void;
}

export default function GroupManager({
  groups,
  setGroups,
  activeGroup,
  setActiveGroup,
  currentUser,
  setCurrentUser,
  toastMessage = () => {},
  permission,
  registeredUsers,
  onUpdateUserRole,
  onDeleteUser,
  onLoginCustom,
  onLogoutCustom,
  isFirebaseConnected,
  treasurerId,
  setTreasurerId,
  treasurerEmail,
  setTreasurerEmail,
  treasurerLineWebhook,
  setTreasurerLineWebhook,
}: GroupManagerProps) {
  // Creating a new Group state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Adding a Member to the active group state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemName, setNewMemName] = useState('');

  // Google interactive login center states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginDisplayName, setLoginDisplayName] = useState('');

  // Define avatar styles presets
  const colorPresets = [
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-500',
    'from-lime-500 to-green-600',
  ];

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    // Create a default first member (the currentUser)
    const newGroupObj: Group = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || '無社團詳細描述。',
      members: [
        { id: currentUser.id, name: currentUser.name, avatarColor: colorPresets[0] }
      ],
    };

    setGroups((prev) => [...prev, newGroupObj]);
    setActiveGroup(newGroupObj);
    
    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreatingGroup(false);
    toastMessage(`🎉 成功創建零件與帳務分攤社群：「${newGroupObj.name}」！`);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemName.trim()) return;

    // Prevent duplicate name in same group
    if (activeGroup.members.some((m) => m.name.toLowerCase() === newMemName.trim().toLowerCase())) {
      alert('該帳號/姓名已存在於此社團中！');
      return;
    }

    const randomColor = colorPresets[Math.floor(Math.random() * colorPresets.length)];
    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: newMemName.trim(),
      avatarColor: randomColor,
    };

    const updatedGroup = {
      ...activeGroup,
      members: [...activeGroup.members, newMember]
    };

    // Update activeGroup and global groups list
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? updatedGroup : g))
    );
    setActiveGroup(updatedGroup);
    
    setNewMemName('');
    setIsAddingMember(false);
    toastMessage(`👤 成功指派成員「${newMember.name}」加入「${activeGroup.name}」！`);
  };

  return (
    <div className="space-y-6" id="group-manager-tab">
      
      {/* 🔒 Google 帳號身分與權限中心 */}
      <section className="bg-neutral-900 border border-neutral-850 rounded-xl p-5 sm:p-6 space-y-6" id="google-auth-control-hub">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[10px] bg-sky-950 border border-sky-900 text-sky-450 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              系統安全核心
            </span>
            <h2 className="text-neutral-100 font-bold text-base mt-2 flex items-center gap-2">
              <Lock size={18} className="text-sky-450" />
              Google 帳號身分與權限管理中心
            </h2>
            <p className="text-neutral-510 text-xs mt-1">
              本平台由 Google 帳號整合登入。管理員可即時核准或指派「一般訪客/學校社團成員/一般民眾」等權限之對稱防護。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
              isFirebaseConnected 
                ? 'bg-emerald-950/45 border-emerald-900/60 text-emerald-400' 
                : 'bg-amber-950/45 border-amber-900/60 text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isFirebaseConnected ? 'Firebase 雲端同步中' : '無 Firebase 金鑰 (沙盒離線模擬模式)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="auth-grid-split">
          
          {/* Column 1: Current identity profile block */}
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 space-y-4 flex flex-col justify-between" id="current-auth-profile">
            <div>
              <h3 className="text-neutral-300 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2">
                <User size={14} className="text-neutral-500" />
                當前 Google 身分識別
              </h3>

              {permission.googleUser ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-4 bg-neutral-900/60 p-3.5 border border-neutral-850 rounded-xl">
                    <img 
                      src={permission.googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${permission.googleUser.email}`} 
                      alt="Google Avatar" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full bg-neutral-950 border-2 border-sky-950"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-200 truncate">{permission.googleUser.displayName}</p>
                      <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">{permission.googleUser.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase">分派系統權限：</p>
                    <div className="flex items-center gap-2">
                      {permission.role === 'admin' && (
                        <span className="text-xs bg-emerald-950 border border-emerald-850 text-emerald-400 font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1">
                          <ShieldCheck size={14} />
                          👑 超級管理員
                        </span>
                      )}
                      {permission.role === 'school' && (
                        <span className="text-xs bg-sky-950 border border-sky-850 text-sky-450 font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1 font-sans">
                          🏫 學校社團特許
                        </span>
                      )}
                      {permission.role === 'public' && (
                        <span className="text-xs bg-purple-950 border border-purple-850 text-purple-400 font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1 font-sans">
                          👥 自主自造民眾
                        </span>
                      )}
                      {permission.role === 'visitor' && (
                        <span className="text-xs bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1 font-sans">
                          🔒 一般訪客
                        </span>
                      )}

                      {permission.status === 'approved' ? (
                        <span className="text-[10px] bg-emerald-900/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/40">已核准啟用</span>
                      ) : (
                        <span className="text-[10px] bg-amber-900/20 text-amber-400 px-2 py-0.5 rounded border border-amber-900/40 animate-pulse">待審核唯讀</span>
                      )}
                    </div>
                  </div>

                  {permission.role === 'visitor' && (
                    <p className="text-[10.5px] text-amber-500 leading-relaxed bg-amber-950/20 p-2.5 border border-amber-900/30 rounded-lg">
                      ⚠️ 您目前帳號為一般訪客，正<strong>「等待管理員審核」</strong>。目前為唯讀狀態，請聯絡管理者 (預設 high200sunny@gmail.com) 核准指派您的權限！
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 py-6 text-center text-neutral-500">
                  <p className="text-xs">系統偵測到您尚未登入任何 Google 帳號。</p>
                  <p className="text-[10px] mt-1 text-neutral-600">目前處於唯讀模式 (不需登入即可瀏覽，限讀)</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-900 mt-4">
              {permission.googleUser ? (
                <button
                  onClick={() => {
                    onLogoutCustom();
                    toastMessage('🔑 已登出 Google 帳號。進入免登入訪客模式。');
                  }}
                  className="w-full bg-red-950/30 hover:bg-red-950 text-red-400 border border-red-900/35 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut size={13} />
                  登出當前 Google 帳號
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isFirebaseConnected) {
                      // Trigger Google login natively
                      onLoginCustom('', '');
                    } else {
                      setShowLoginModal(true);
                    }
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-505 text-neutral-950 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow shadow-sky-950/20 transition-colors"
                >
                  <Mail size={14} />
                  使用 Google 帳號 登入/註冊
                </button>
              )}
            </div>
          </div>

          {/* Column 2 & 3: Administrator User Role Assignment workstation (Only rendered for admin) */}
          <div className="lg:col-span-2 bg-neutral-950 border border-neutral-850 rounded-xl p-5 flex flex-col justify-between" id="admin-delegates-workstation">
            <div>
              <h3 className="text-neutral-350 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-neutral-900 pb-3">
                <ShieldCheck size={14} className="text-emerald-450" />
                👑 Google 帳號角色審核與權限分派
                {permission.role === 'admin' && (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-450 px-2 py-0.5 rounded font-mono font-bold tracking-normal uppercase ml-auto">
                    管理員工作站
                  </span>
                )}
              </h3>

              {permission.role !== 'admin' ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-500 h-full border border-dashed border-neutral-850 rounded-xl" id="restricted-administrator-hud">
                  <ShieldAlert size={36} className="text-neutral-600 mb-2" />
                  <p className="text-xs font-medium text-neutral-400">安全性層級不足</p>
                  <p className="text-[10.5px] text-neutral-600 max-w-sm mt-1 leading-relaxed">
                    僅預設管理員<strong>「high200sunny@gmail.com」</strong>擁有登入並指派其餘使用者權限的權力。請使用上述帳號登入系統，或聯絡該管理者核實帳目、指派權限。
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1" id="admin-user-flow-list">
                  {registeredUsers.length <= 1 ? (
                    <p className="text-xs text-neutral-500 py-6 text-center">目前尚無其他待核准的 Google 註冊帳號。</p>
                  ) : (
                    registeredUsers.map((userObj) => {
                      const isSelf = userObj.email === permission.googleUser?.email;
                      if (isSelf) return null; // We hide self to avoid locking oneself out
                      return (
                        <div 
                          key={userObj.uid}
                          className="bg-neutral-900/50 border border-neutral-850 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans"
                        >
                          <div className="flex items-center gap-3">
                            <img 
                              src={userObj.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${userObj.email}`}
                              alt="avatar" 
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-200 truncate">
                                {userObj.displayName}
                              </p>
                              <p className="text-[10px] text-neutral-500 font-mono truncate">{userObj.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap font-sans">
                            {/* Role selector dropdown */}
                            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
                              <span className="text-[10px] text-neutral-500">權限:</span>
                              <select
                                value={userObj.role}
                                onChange={async (e) => {
                                  await onUpdateUserRole(userObj.uid, e.target.value, userObj.status);
                                  toastMessage(`已儲存權限指派為：${e.target.value}`);
                                }}
                                className="bg-transparent text-[11px] text-neutral-200 focus:outline-none cursor-pointer font-medium"
                              >
                                <option value="visitor" className="bg-neutral-950 text-neutral-300">一般訪客</option>
                                <option value="school" className="bg-neutral-950 text-neutral-300">學校社團</option>
                                <option value="public" className="bg-neutral-950 text-neutral-300">一般民眾</option>
                                <option value="admin" className="bg-neutral-950 text-neutral-300">管理員</option>
                              </select>
                            </div>

                            {/* Approval status selector dropdown */}
                            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
                              <span className="text-[10px] text-neutral-500">狀態:</span>
                              <select
                                value={userObj.status}
                                onChange={async (e) => {
                                  await onUpdateUserRole(userObj.uid, userObj.role, e.target.value);
                                  toastMessage(`已核准使用者狀態為：${e.target.value}`);
                                }}
                                className="bg-transparent text-[11px] text-neutral-200 focus:outline-none cursor-pointer font-medium"
                              >
                                <option value="pending" className="bg-neutral-950 text-neutral-300">待審核</option>
                                <option value="approved" className="bg-neutral-950 text-neutral-300">已啟用</option>
                              </select>
                            </div>

                            <button
                              onClick={async () => {
                                if (confirm(`確定要完全撤銷/刪除此帳號 ${userObj.email} 的授權嗎？`)) {
                                  await onDeleteUser(userObj.uid);
                                  toastMessage(`已完全移除使用者：${userObj.displayName}`);
                                }
                              }}
                              className="p-1.5 bg-neutral-950 hover:bg-neutral-900 text-neutral-500 hover:text-red-400 rounded border border-neutral-800 hover:border-neutral-700 cursor-pointer text-xs transition-colors"
                              title="完全刪除此帳號"
                            >
                              <UserX size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            
            <p className="border-t border-neutral-900 pt-3 mt-3 text-[10.5px] text-neutral-500 flex items-center gap-1 leading-relaxed bg-transparent">
              <Info size={11} className="text-neutral-500" />
              <span>管理者工作站：點擊下拉式選單直接套用；擁有者 high200sunny@gmail.com 享有永久最高支配權。</span>
            </p>
          </div>

        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Simulated identities & Account Switching */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4" id="simulation-identity-panel">
          <div>
            <h3 className="text-neutral-100 font-semibold text-sm flex items-center gap-2">
              <RefreshCw className="text-blue-400" size={16} />
              切換模擬操作身份 (Simulated Accounts)
            </h3>
            <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed">
              因應本平台為多成員對帳設計，點擊下方不同成員，可即時變更您的查看權限，體驗「您需要支付多少」或「您可收回多少」在不同角色間的實時結算：
            </p>
          </div>

          <div className="space-y-2" id="members-identity-list">
            {activeGroup.members.map((member) => {
              const isActive = currentUser.id === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => {
                    setCurrentUser(member);
                    toastMessage(`🔑 成功切換操作身份為：${member.name}`);
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600/10 border-blue-600 shadow-md text-blue-400' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${member.avatarColor} flex items-center justify-center font-bold text-neutral-950 text-xs`}>
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{member.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 font-sans">
                        {isActive ? '👑 當前登入學友' : '社團一般成員'}
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <UserCheck size={10} />
                      使用中
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 group-hover:text-neutral-300">點擊登入</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User adding form trigger */}
          {!isAddingMember ? (
            <button
              onClick={() => setIsAddingMember(true)}
              className="w-full py-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus size={13} />
              添加新隊員至本群組
            </button>
          ) : (
            <form onSubmit={handleAddMember} className="bg-neutral-950 p-4 border border-neutral-800 rounded-xl space-y-3">
              <p className="text-neutral-400 text-xs font-medium">指派新成員名字：</p>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="例如：阿龍、佳佳"
                value={newMemName}
                onChange={(e) => setNewMemName(e.target.value)}
                className="w-full bg-neutral-905 border border-neutral-800 focus:border-blue-600 text-neutral-200 px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-colors"
              />
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="flex-1 bg-neutral-800 text-neutral-400 py-1 rounded cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-1 rounded cursor-pointer hover:bg-blue-700"
                >
                  新增
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Center/Right columns: Club lists and Club creation */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Club info & Details */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6" id="active-club-details-panel">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4 mb-4">
              <div>
                <span className="text-[10px] bg-blue-950 border border-blue-900 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                  當前主要社團
                </span>
                <h3 className="text-neutral-100 font-bold text-lg mt-2">{activeGroup.name}</h3>
                <p className="text-neutral-400 text-xs mt-1.5 leading-relaxed">{activeGroup.description}</p>
              </div>
              <Users className="text-blue-400 flex-shrink-0" size={32} />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                社群成員名單 ({activeGroup.members.length} 人)：
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeGroup.members.map((member) => (
                  <div 
                    key={member.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${member.avatarColor} flex items-center justify-center font-bold text-neutral-950 text-xs`}>
                      {member.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-200 truncate">{member.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate font-mono">member</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📢 財務長設定與 LINE / Mail 通知管道管理中心 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6" id="treasurer-notification-settings-panel">
            <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-4 mb-4">
              <Bell className="text-blue-500" size={20} />
              <div>
                <h3 className="text-neutral-100 font-bold text-sm">📢 財務長設定與 LINE / Mail 通知管理中心</h3>
                <p className="text-neutral-500 text-[10px] mt-0.5">指定社務財務代理人，與配置 LINE Webhook 和信件之自動化對帳管道</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Treasurer Dispatch Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Select member as Treasurer */}
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    👤 指定社團財務長 (Treasurer)
                  </label>
                  <select
                    value={treasurerId}
                    onChange={(e) => {
                      setTreasurerId(e.target.value);
                      const memb = activeGroup.members.find((m) => m.id === e.target.value);
                      if (memb) {
                        toastMessage(`📢 已指定「${memb.name}」為當前社團財務長！`);
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-lg font-medium transition-colors focus:border-blue-600 outline-none cursor-pointer"
                  >
                    {activeGroup.members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} (學社成員)</option>
                    ))}
                  </select>
                </div>

                {/* Treasurer Email Input */}
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    ✉️ 財務長電子信箱 (Mail Address)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="請輸入財務長收發信箱..."
                    value={treasurerEmail}
                    onChange={(e) => setTreasurerEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-lg transition-colors focus:border-blue-600 outline-none font-mono text-[11px]"
                  />
                </div>

              </div>

              {/* Webhook Settings Grid */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1 flex items-center justify-between">
                    <span>🟢 LINE Webhook 通道 / LINE Notify 連結 (外部 API 管道)</span>
                    <span className="text-[9px] text-blue-500 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-900/40">支援任意 POST 連接器</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：https://api.line.me/webhook 或您的 Discord / LINE Webhook API 端點..."
                    value={treasurerLineWebhook}
                    onChange={(e) => setTreasurerLineWebhook(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 px-3 py-2 rounded-lg focus:border-blue-600 outline-none font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                    💡 系統支援發送即時對帳與採購缺件備忘錄。若配置 Webhook。當您點選 **「送出 LINE 通知」** 時，本平台將發送含有 Rich Table 資訊的 JSON Payload，達成即時物聯互通！
                  </p>
                </div>
              </div>

              {/* Active Channels indicators */}
              <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-950 border border-green-850 flex items-center justify-center text-green-400 font-bold shrink-0">
                    L
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-200 text-xs">
                      當前通知對象：{activeGroup.members.find(m => m.id === treasurerId)?.name || '未指定'}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      管道狀態：信件已就緒 • Webhook: {treasurerLineWebhook ? '已配置 (支援 API 傳輸)' : '尚未配置 / 本地複製模式'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `🔔 零配社團狀態測試\n=================\n群組：${activeGroup.name}\n測試：對話通道運作正常！\n財務長：${activeGroup.members.find(m => m.id === treasurerId)?.name}\n時間：${new Date().toLocaleString()}`;
                      const mailLink = `mailto:${treasurerEmail}?subject=${encodeURIComponent(`【系統測試】${activeGroup.name} 財務通訊服務開啟`)}&body=${encodeURIComponent(text)}`;
                      window.open(mailLink, '_blank');
                      toastMessage(`✉️ 已開啟本機電子郵件用戶端進行測試信發送。`);
                    }}
                    className="flex-1 sm:flex-none text-center bg-neutral-900 border border-neutral-800 text-neutral-350 hover:text-white px-3 py-2 rounded-lg text-xs leading-relaxed transition-colors cursor-pointer"
                  >
                    測試發送測試郵件
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Group Creation list and triggers */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
              <h3 className="text-neutral-100 font-semibold text-sm">瀏覽/加入其他科技分會群組 ({groups.length})</h3>
              <button
                onClick={() => {
                  setIsCreatingGroup(!isCreatingGroup);
                }}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                {!isCreatingGroup ? '+ 創立新社團群組' : '取消'}
              </button>
            </div>

            {isCreatingGroup ? (
              <form onSubmit={handleCreateGroup} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4 mb-4">
                <h4 className="text-neutral-200 font-medium text-xs">🛠️ 創立全新科技零件分帳小組</h4>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    群組小組名稱 *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="例如：AI智慧循跡車團隊、空拍組"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-600 text-neutral-200 px-3 py-2 text-xs rounded-lg focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    宗旨或活動簡介
                  </label>
                  <textarea
                    rows={2}
                    maxLength={100}
                    placeholder="簡單述說此社群的主要開發項目或分攤規矩..."
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-600 text-neutral-200 px-3 py-2 text-xs rounded-lg focus:outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 rounded text-xs transition-colors cursor-pointer"
                >
                  確認創立社群
                </button>
              </form>
            ) : null}

            <div className="space-y-3" id="all-clubs-directory">
              {groups.map((group) => {
                const isActive = activeGroup.id === group.id;
                return (
                  <div
                    key={group.id}
                    className={`bg-neutral-950 p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isActive ? 'border-blue-600 bg-blue-950/5' : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-neutral-200">{group.name}</h4>
                      <p className="text-neutral-500 text-[11px] mt-1 leading-relaxed line-clamp-1">{group.description}</p>
                      <p className="text-[10px] text-neutral-400 mt-2 font-mono flex items-center gap-1.5">
                        <Users size={10} className="text-neutral-500" />
                        成員：{group.members.map((m) => m.name).join(', ')}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="text-[10px] text-blue-400 bg-blue-950 border border-blue-900 px-3 py-1 rounded-lg shrink-0 text-center select-none font-bold">
                        當前所在小組
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveGroup(group);
                          // Match user if they elements in group or switch to first
                          const foundUsr = group.members.find((m) => m.name === currentUser.name) || group.members[0];
                          setCurrentUser(foundUsr);
                          toastMessage(`📂 成功移轉至群組：「${group.name}」`);
                        }}
                        className="text-xs bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-3 py-1 rounded-lg border border-neutral-800 cursor-pointer shrink-0 text-center"
                      >
                        切換到此小組
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* 🔑 Simulated Auth Modal for Sandbox Trial */}
      {showLoginModal && (
        <div className="fixed inset-0 z-55 bg-neutral-950/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-sky-950 border border-sky-850 flex items-center justify-center text-sky-450 mb-3">
                <Lock size={22} />
              </div>
              <h3 className="text-neutral-100 font-bold text-base">🔑 模擬 Google 整合登入帳號</h3>
              <p className="text-neutral-510 text-xs mt-1">
                由於本環境尚未配置 Firebase 金鑰，系統已載入模擬登入沙盒。您可以模擬切換不同權限，深度體驗系統對稱防護。
              </p>
            </div>

            <div className="space-y-2.5">
              
              <button
                onClick={() => {
                  onLoginCustom('high200sunny@gmail.com', '王大明 Sunny (預設管理員)');
                  setShowLoginModal(false);
                  toastMessage('🔑 成功模擬登入預設高階管理員 high200sunny@gmail.com');
                }}
                className="w-full text-left p-3.5 rounded-xl border border-sky-900 bg-sky-950/20 hover:bg-sky-950/40 text-sky-400 flex items-center justify-between transition-all cursor-pointer"
              >
                <div>
                  <p className="text-xs font-bold font-sans">👑 模擬預設管理員 (Pre-approved Admin)</p>
                  <p className="text-[10px] text-neutral-550 font-mono mt-0.5">high200sunny@gmail.com</p>
                </div>
                <ArrowRight size={13} />
              </button>

              <div className="h-px bg-neutral-800/60 my-2" />

              <p className="text-[10px] text-neutral-400 font-bold uppercase pl-1 font-sans">快速註冊全新測試帳號：</p>

              <div className="space-y-3 bg-neutral-950 p-4 border border-neutral-850 rounded-xl">
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-1">自定義電子郵件 (e.g. test@edu.tw)</label>
                  <input 
                    type="email" 
                    placeholder="輸入測試信箱..." 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-neutral-905 border border-neutral-800 focus:border-sky-600 text-neutral-200 px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-500 mb-1">成員中文名字 (e.g. 阿龍)</label>
                  <input 
                    type="text" 
                    placeholder="輸入暱稱/名牌..." 
                    value={loginDisplayName}
                    onChange={(e) => setLoginDisplayName(e.target.value)}
                    className="w-full bg-neutral-905 border border-neutral-800 focus:border-sky-600 text-neutral-200 px-3 py-1.5 text-xs rounded-lg focus:outline-none transition-colors"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const typedEmail = loginEmail.trim();
                    const typedName = loginDisplayName.trim();
                    if (!typedEmail || !typedName) {
                      alert('請完整輸入專用電子郵件與成員名字，以模擬註冊流程！');
                      return;
                    }
                    onLoginCustom(typedEmail, typedName);
                    setShowLoginModal(false);
                    toastMessage(`🎉 成功註冊並登入模擬帳號：${typedName} (${typedEmail})！目前狀態為「一般訪客 (待審核)」，請切換到管理員進行核准！`);
                  }}
                  className="w-full bg-sky-600 hover:bg-sky-505 text-neutral-950 font-bold py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  創立並以 Google 身分登入
                </button>
              </div>

            </div>

            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full bg-neutral-800 hover:bg-neutral-750 text-neutral-400 py-1.5 rounded-lg text-xs cursor-pointer text-center"
            >
              取消關閉
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
