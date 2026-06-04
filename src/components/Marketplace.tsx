import React, { useState, useMemo } from 'react';
import { Group, Member, PartListing, Expense, PartStatus } from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  ShoppingBag, 
  CheckCircle, 
  Tag, 
  User, 
  Info, 
  Bookmark, 
  Trash2,
  ListFilter,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface MarketplaceProps {
  activeGroup: Group;
  currentUser: Member;
  listings: PartListing[];
  setListings: React.Dispatch<React.SetStateAction<PartListing[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  toastMessage?: (msg: string) => void;
  permission: {
    canWrite: boolean;
    isAdmin: boolean;
    googleUser: any;
  };
}

export default function Marketplace({
  activeGroup,
  currentUser,
  listings,
  setListings,
  setExpenses,
  toastMessage = () => {},
  permission,
}: MarketplaceProps) {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PartStatus>('all');
  
  // Show listing creation panel
  const [isCreating, setIsCreating] = useState(false);

  // Listing Form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('電子電控');
  const [newStatus, setNewStatus] = useState<PartStatus>('available');
  const [newPrice, setNewPrice] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newDesc, setNewDesc] = useState('');
  const [newSpec, setNewSpec] = useState('');

  const categories = ['電子電控', '動力與電機', '結構五金', '外殼材料', '智能傳感器', '工具五金', '其他'];

  // Current active group listings
  const groupListings = useMemo(() => {
    return listings.filter((l) => l.groupId === activeGroup.id);
  }, [listings, activeGroup]);

  // Filter lists
  const filteredListings = useMemo(() => {
    return groupListings.filter((l) => {
      const matchSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          l.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || l.category === selectedCategory;
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [groupListings, searchQuery, selectedCategory, statusFilter]);

  // Statistics for active group listings
  const stats = useMemo(() => {
    const availableCount = groupListings.filter((l) => l.status === 'available').length;
    const neededCount = groupListings.filter((l) => l.status === 'needed').length;
    const exchangedCount = groupListings.filter((l) => l.status === 'exchanged').length;
    return { availableCount, neededCount, exchangedCount };
  }, [groupListings]);

  // Save new listing handler
  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，請先登入 Google 帳號，並聯絡管理員指派「學校社團」或「一般民眾」權限！');
      return;
    }
    if (!newName.trim() || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) < 0) {
      return;
    }

    const priceNum = Math.round(parseFloat(newPrice));
    const qtyNum = parseInt(newQty) || 1;

    const newListing: PartListing = {
      id: `part-${Date.now()}`,
      groupId: activeGroup.id,
      name: newName.trim(),
      category: newCategory,
      status: newStatus,
      price: priceNum,
      quantity: qtyNum,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      description: newDesc.trim() || '無額外說明。',
      createdAt: new Date().toISOString(),
      specification: newSpec.trim() || undefined
    };

    setListings((prev) => [newListing, ...prev]);
    toastMessage(`刊登成功！已成功新增項目：${newListing.name}`);

    // Reset Form
    setNewName('');
    setNewPrice('');
    setNewQty('1');
    setNewDesc('');
    setNewSpec('');
    setIsCreating(false);
  };

  // Fast action: mark custom state
  const handleUpdateStatus = (id: string, nextStatus: PartStatus) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法變更零件狀態！');
      return;
    }
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: nextStatus } : l))
    );
    
    const item = listings.find((l) => l.id === id);
    if (item) {
      const ChineseStatus = nextStatus === 'exchanged' ? '已交易完成' : nextStatus === 'available' ? '多餘可購買' : '急迫徵求';
      toastMessage(`狀態變更！「${item.name}」已轉為 ${ChineseStatus}`);
    }
  };

  // Delete listing owned by user
  const handleDeleteListing = (id: string) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法刪除零件！');
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toastMessage('刊登已下架或刪除！');
  };

  // Core feature: Purchase on spot & ledger into sharing expenses automatically!
  const handleGroupPurchase = (listing: PartListing) => {
    if (!permission.canWrite) {
      alert('🔒 訪客唯讀模式，無法分攤購買公有零件！連結 Google 帳號與社團權限解鎖。');
      return;
    }
    // 1. Mark part listing as exchanged
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, status: 'exchanged' as const } : l))
    );

    // 2. Generate a shared expense ledger
    const totalCost = listing.price * listing.quantity;
    const newExpense: Expense = {
      id: `exp-swap-${Date.now()}`,
      groupId: activeGroup.id,
      title: `【零件市集採購】${listing.name} (x${listing.quantity})`,
      amount: totalCost,
      paidById: listing.ownerId, // The seller paid this to provide the part to the group
      paidByName: listing.ownerName,
      splitWithIds: activeGroup.members.map((m) => m.id), // Splitting among all members
      date: new Date().toISOString(),
      category: '電子元器件',
    };

    setExpenses((prev) => [newExpense, ...prev]);
    toastMessage(`🎉 成功分攤購買！已將「${listing.name}」共 ${totalCost} 元，登錄為社團公有分攤，由全隊成員平分。`);
  };

  return (
    <div className="space-y-6" id="marketplace-tab">
      
      {/* Search and filters summary row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4" id="marketplace-filter-shell">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status quick toggle */}
          <button 
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${statusFilter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700'}`}
          >
            全部 ({groupListings.length})
          </button>
          <button 
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${statusFilter === 'available' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700'}`}
          >
            多餘供購買 ({stats.availableCount})
          </button>
          <button 
            onClick={() => setStatusFilter('needed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${statusFilter === 'needed' ? 'bg-amber-950/80 text-amber-400 border border-amber-900' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700'}`}
          >
            所需零件徵求 ({stats.neededCount})
          </button>
          <button 
            onClick={() => setStatusFilter('exchanged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${statusFilter === 'exchanged' ? 'bg-neutral-900 text-neutral-500 border border-neutral-800/60' : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-700'}`}
          >
            已交換/購妥 ({stats.exchangedCount})
          </button>
        </div>

        {/* Global Search and Cat filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 text-neutral-500" size={14} />
            <input 
              type="text" 
              placeholder="搜尋零件關鍵字、規格..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-600 text-neutral-200 pl-8.5 pr-3 py-2 text-xs rounded-lg focus:outline-none transition-colors"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-neutral-950 border border-neutral-800 text-neutral-400 px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer text-ellipsis truncate"
          >
            <option value="all">所有零件分類</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsCreating(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-850/10 transition-colors ml-0 sm:ml-2"
          >
            <Plus size={14} />
            刊登零件
          </button>
        </div>
      </div>

      {/* Main interface layout: listings on left, posting panel floating on right if active */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="marketplace-workspace">
        {/* Marketplace entries list */}
        <div className="xl:col-span-2 space-y-4" id="marketplace-listings-deck">
          {filteredListings.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-xl" id="no-listings-view">
              <Package size={40} className="text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm">此分類或條件下，目前沒有刊登零件</p>
              <button 
                onClick={() => setIsCreating(true)}
                className="mt-4 text-xs text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                立即當第一個刊登者嗎？
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="listings-grid">
              {filteredListings.map((listing) => (
                <div 
                  key={listing.id} 
                  className={`bg-neutral-900 border hover:border-neutral-700 rounded-xl p-5 flex flex-col justify-between transition-all group ${
                    listing.status === 'exchanged' ? 'opacity-65 border-neutral-950 bg-neutral-950' : 'border-neutral-800 shadow-md'
                  }`}
                >
                  <div>
                    {/* Header: tags and owner */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className={`text-[10px] font-medium font-sans px-2.5 py-0.5 rounded-full border ${
                        listing.status === 'available' 
                          ? 'bg-emerald-950/50 border-emerald-900 text-emerald-400' 
                          : listing.status === 'needed' 
                          ? 'bg-amber-950/50 border-amber-900 text-amber-400' 
                          : 'bg-neutral-950 border-neutral-850 text-neutral-500'
                      }`}>
                        {listing.status === 'available' && '🔵 多餘提供'}
                        {listing.status === 'needed' && '🟠 急缺徵求'}
                        {listing.status === 'exchanged' && '⚪ 已交換/購妥'}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <User size={12} />
                        <span className="truncate max-w-24 text-neutral-400 font-medium">{listing.ownerName}</span>
                        {listing.ownerId === currentUser.id && (
                          <span className="bg-neutral-850 text-[9px] px-1 rounded text-neutral-400">我</span>
                        )}
                      </div>
                    </div>

                    {/* Card Title */}
                    <h3 className="font-semibold text-neutral-100 group-hover:text-blue-400 text-sm transition-colors mb-1">
                      {listing.name}
                    </h3>
                    
                    {/* Specifications if any */}
                    {listing.specification && (
                      <p className="font-mono text-[11px] text-neutral-400 bg-neutral-950 px-2 py-1 rounded inline-block mt-0.5 mb-2 border border-neutral-800">
                        {listing.specification}
                      </p>
                    )}

                    {/* Description */}
                    <p className="text-neutral-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  {/* Pricing, Quantity & Interactive transaction actions */}
                  <div className="mt-5 pt-3.5 border-t border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] text-neutral-500 font-sans">預計單價</p>
                        <p className="text-base font-bold font-mono text-blue-400">
                          NT$ {listing.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500 font-sans">儲備數量</p>
                        <p className="text-xs font-mono font-bold text-neutral-300">
                          {listing.quantity} 件
                        </p>
                      </div>
                    </div>

                    {/* Action buttons based on ownership and state */}
                    <div className="flex items-center gap-2 font-sans">
                      {listing.status !== 'exchanged' ? (
                        <>
                          {/* If the current user owns this, they can delete it or change status to completed */}
                          {listing.ownerId === currentUser.id ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(listing.id, 'exchanged')}
                                className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs py-1.5 px-2 rounded-lg border border-neutral-700 transition-colors cursor-pointer text-center font-medium"
                              >
                                標記已完成交易
                              </button>
                              <button
                                onClick={() => handleDeleteListing(listing.id)}
                                className="bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 p-1.5 rounded-lg border border-neutral-700 hover:border-red-900 transition-colors cursor-pointer"
                                title="下架本項零件"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* If someone else owns it and it's available, purchase/spend it directly split with group! */}
                              {listing.status === 'available' ? (
                                <button
                                  onClick={() => handleGroupPurchase(listing)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-md shadow-blue-950/15"
                                >
                                  <ShoppingBag size={13} />
                                  幫社團買下它 (自動分攤)
                                </button>
                              ) : (
                                /* Fulfills a "needed" part request */
                                <button
                                  onClick={() => handleUpdateStatus(listing.id, 'exchanged')}
                                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-medium py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  我有多餘的！提供此件
                                </button>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        /* Exchanged items allow visual rollback or clean delete if self */
                        <div className="flex items-center justify-between w-full">
                          <span className="text-neutral-500 text-xs flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-neutral-600" />
                            已交換 / 停止尋找
                          </span>
                          {listing.ownerId === currentUser.id && (
                            <button
                              onClick={() => handleDeleteListing(listing.id)}
                              className="text-xs text-red-400/80 hover:text-red-400 bg-red-950/20 px-2 py-1 rounded border border-red-900/35 hover:border-red-900/60 cursor-pointer"
                            >
                              刪除紀錄
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Form to list parts: either floating overlay or responsive card section depending on toggle */}
        <div className="xl:col-span-1" id="marketplace-form-panel">
          {isCreating ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative animate-in fade-in" id="quick-publish-form">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                <h3 className="text-neutral-100 font-semibold text-sm flex items-center gap-2">
                  <Plus size={16} className="text-blue-400" />
                  輕鬆刊登零件
                </h3>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="text-neutral-500 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
                >
                  關閉
                </button>
              </div>

              {!permission.canWrite && (
                <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-4 text-xs text-amber-400 leading-relaxed mb-4">
                  ⚠️ 您目前處於<strong>「訪客唯讀模式」</strong>。需要先登入 Google 帳號，並聯絡管理者審核啟用、指派「學校社團」或「一般民眾」權限，才可刊登、發布、下架或分攤購買零件。
                </div>
              )}

              <form onSubmit={handleCreateListing} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    零件/材料名稱 *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="請輸入零件品牌與完整型號" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-neutral-905 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      刊登類型
                    </label>
                    <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setNewStatus('available')}
                        className={`flex-1 text-[11px] py-1 rounded text-center cursor-pointer transition-all ${newStatus === 'available' ? 'bg-blue-600 text-white font-semibold' : 'text-neutral-450'}`}
                      >
                        多餘可售
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStatus('needed')}
                        className={`flex-1 text-[11px] py-1 rounded text-center cursor-pointer transition-all ${newStatus === 'needed' ? 'bg-amber-600 text-zinc-950 font-medium' : 'text-neutral-450'}`}
                      >
                        所需徵求
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      分類
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-300 focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      單件估價 (TWD) *
                    </label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      placeholder="NT$" 
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      數量 *
                    </label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    硬體主要規格 (可選)
                  </label>
                  <input 
                    type="text" 
                    placeholder="如: 6S 1950KV, 直徑120mm" 
                    value={newSpec}
                    onChange={(e) => setNewSpec(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    詳細描述 *
                  </label>
                  <textarea 
                    rows={3}
                    required
                    placeholder="請描述零件的使用狀況、新舊程度或期望的交換零件條件。" 
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 hover:border-neutral-750 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-blue-600 transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    disabled={!permission.canWrite}
                    className={`flex-1 font-bold py-2 rounded-lg text-sm shadow transition-colors ${
                      permission.canWrite 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                        : 'bg-neutral-800 border border-neutral-750 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {permission.canWrite ? '發布刊登' : '🔒 訪客唯讀'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 text-center shadow-md border-dashed sticky top-4" id="placeholder-form-teaser">
              <Package size={24} className="text-neutral-500 mx-auto mb-2" />
              <h4 className="text-neutral-300 font-medium text-xs">手邊有多餘的零組件材料嗎？</h4>
              <p className="text-neutral-500 text-[11px] mt-1.5 leading-relaxed">
                有些零件雖然多買了，但也許其他隊友此時此刻正好缺它！刊登出來快速買賣或交換，還可以一鍵記錄到分攤帳本中！
              </p>
              <button 
                onClick={() => setIsCreating(true)}
                className="mt-4 bg-neutral-950 border border-neutral-850 hover:border-neutral-700 hover:text-blue-400 text-neutral-305 font-medium px-4 py-2 text-xs rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={12} />
                立即開始刊登
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
