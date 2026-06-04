import { Group, PartListing, Project, Expense, Member } from './types';

// Predefined members with distinctive avatar styling
export const INITIAL_MEMBERS: Record<string, Member[]> = {
  'group-robomaster': [
    { id: 'mem-ahao', name: '阿豪', avatarColor: 'from-cyan-500 to-blue-600' },
    { id: 'mem-jialing', name: '佳玲', avatarColor: 'from-fuchsia-500 to-pink-600' },
    { id: 'mem-xiaoming', name: '小明', avatarColor: 'from-emerald-500 to-teal-600' },
    { id: 'mem-guanyu', name: '冠宇', avatarColor: 'from-amber-500 to-orange-600' },
  ],
  'group-fpv': [
    { id: 'mem-achang', name: '阿昌', avatarColor: 'from-violet-500 to-purple-600' },
    { id: 'mem-kevin', name: '凱文', avatarColor: 'from-indigo-500 to-blue-600' },
    { id: 'mem-liting', name: '莉婷', avatarColor: 'from-rose-500 to-pink-600' },
    { id: 'mem-xiaopang', name: '小胖', avatarColor: 'from-lime-500 to-green-600' },
  ],
  'group-iot': [
    { id: 'mem-shuhao', name: '書豪', avatarColor: 'from-cyan-500 to-teal-500' },
    { id: 'mem-xinyi', name: '欣怡', avatarColor: 'from-purple-500 to-pink-500' },
    { id: 'mem-zhiwei', name: '志偉', avatarColor: 'from-orange-500 to-red-500' },
  ],
};

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'group-robomaster',
    name: 'RoboMaster 機器人戰隊',
    description: '為了參加年度全國機器人對抗賽而成立的技術戰隊，專注於底盤、發射機構與自動雲台。',
    members: INITIAL_MEMBERS['group-robomaster'],
  },
  {
    id: 'group-fpv',
    name: 'FPV 穿越機愛好會',
    description: '業餘組裝穿越無人機、模擬器練習，以及航拍技術交流社群。分攤各類馬達與槳片費用。',
    members: INITIAL_MEMBERS['group-fpv'],
  },
  {
    id: 'group-iot',
    name: 'IoT 智慧溫室工作坊',
    description: '開源科技溫室專案，利用各類傳感器自動調節澆灌系統，分攤微控制器與水管接頭。',
    members: INITIAL_MEMBERS['group-iot'],
  },
];

export const INITIAL_PART_LISTINGS: PartListing[] = [
  // RoboMaster Group Parts
  {
    id: 'part-rm-1',
    groupId: 'group-robomaster',
    name: 'DJI M3508 無刷減速電機',
    category: '動力與電機',
    status: 'available',
    price: 2200,
    quantity: 2,
    ownerId: 'mem-ahao',
    ownerName: '阿豪',
    description: '全新未拆，原本備用但後來底盤改規格，便宜轉售給隊友。',
    createdAt: '2026-05-20T10:00:00Z',
    specification: '24V, 輸出扭矩高達 3N·m',
  },
  {
    id: 'part-rm-2',
    groupId: 'group-robomaster',
    name: 'RoboMaster C620 無刷電調 (ESC)',
    category: '電子電控',
    status: 'available',
    price: 1100,
    quantity: 4,
    ownerId: 'mem-jialing',
    ownerName: '佳玲',
    description: '測試過功能完好，外觀有輕微焊接痕跡，配合M3508完美運作。',
    createdAt: '2026-05-22T14:30:00Z',
    specification: '支援 20V-26V 恆定電流20A',
  },
  {
    id: 'part-rm-3',
    groupId: 'group-robomaster',
    name: '麥克納姆輪 6英吋 (左/右各二)',
    category: '結構五金',
    status: 'needed',
    price: 800,
    quantity: 4,
    ownerId: 'mem-ahao',
    ownerName: '阿豪',
    description: '英雄機器人地盤急缺4個高品質麥克納姆輪，要求外膠圈完整無打滑。',
    createdAt: '2026-05-24T08:15:00Z',
    specification: '直徑152mm，負重20kg以上',
  },
  {
    id: 'part-rm-4',
    groupId: 'group-robomaster',
    name: 'Arduino Mega 2560 開發板',
    category: '電子電控',
    status: 'needed',
    price: 450,
    quantity: 1,
    ownerId: 'mem-xiaoming',
    ownerName: '小明',
    description: '副控模組需要一片 Mega2560 進行多IO擴展，手頭上有閒置板子的隊友求支援！',
    createdAt: '2026-05-25T11:00:00Z',
    specification: '含 USB 傳輸線，相容 R3 版',
  },
  {
    id: 'part-rm-5',
    groupId: 'group-robomaster',
    name: '18650 4S 鋰電池組',
    category: '動力與電機',
    status: 'available',
    price: 1200,
    quantity: 1,
    ownerId: 'mem-guanyu',
    ownerName: '冠宇',
    description: '客製焊接的高倍率鋰電池包，因換24V大電池故出清。安全防護板已焊接。',
    createdAt: '2026-05-25T18:20:00Z',
    specification: '14.8V 3400mAh 附XT60接頭',
  },
  {
    id: 'part-rm-6',
    groupId: 'group-robomaster',
    name: 'RoboMaster 開發板 Type-A',
    category: '電子電控',
    status: 'exchanged',
    price: 3500,
    quantity: 1,
    ownerId: 'mem-jialing',
    ownerName: '佳玲',
    description: '已跟小明完成交換。原價4000多購入，交換成主板控制。',
    createdAt: '2026-05-18T09:00:00Z',
    specification: 'STM32F427II 主控 MCU',
  },

  // FPV Group Parts
  {
    id: 'part-fpv-1',
    groupId: 'group-fpv',
    name: 'T-Motor Velox V2207 無刷馬達',
    category: '動力與電機',
    status: 'available',
    price: 450,
    quantity: 4,
    ownerId: 'mem-achang',
    ownerName: '阿昌',
    description: '全新四顆，1950KV適合6S穿越機。原本想組新機，因缺錢割愛。',
    createdAt: '2026-05-24T12:00:00Z',
    specification: '1950KV 支援 6S 供電',
  },
  {
    id: 'part-fpv-2',
    groupId: 'group-fpv',
    name: '5043 三葉槳片 (一包2對裝)',
    category: '結構五金',
    status: 'available',
    price: 60,
    quantity: 10,
    ownerId: 'mem-kevin',
    ownerName: '凱文',
    description: '囤太多了吃灰，需要暴力飛行炸槳的隊友可以隨時拿，當場分攤幾塊錢。',
    createdAt: '2026-05-26T15:00:00Z',
    specification: 'Ethix S3 甜瓜綠配色 5043',
  },
  {
    id: 'part-fpv-3',
    groupId: 'group-fpv',
    name: 'RunCam Link 鳳凰HD天空端套件',
    category: '電子電控',
    status: 'needed',
    price: 4200,
    quantity: 1,
    ownerId: 'mem-liting',
    ownerName: '莉婷',
    description: '跪求良品天空端，眼鏡是大疆FPV V2，希望有圖傳天線和同軸線。',
    createdAt: '2026-05-26T20:30:00Z',
    specification: 'DJI FPV 數位圖傳相容',
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-rm-1',
    groupId: 'group-robomaster',
    name: '英雄機器人 (Hero Robot) 4向底盤開發',
    description: '4輪獨立懸掛與硬軸大扭矩驅動，專門負責場內大彈丸射擊的角色底盤。',
    bomItems: [
      { id: 'bom-1', partName: 'DJI M3508 無刷減速電機', category: '動力與電機', requiredQty: 4 },
      { id: 'bom-2', partName: 'RoboMaster C620 無刷電調 (ESC)', category: '電子電控', requiredQty: 4 },
      { id: 'bom-3', partName: '麥克納姆輪 6英吋 (左/右各二)', category: '結構五金', requiredQty: 4 },
      { id: 'bom-4', partName: 'Arduino Mega 2560 開發板', category: '電子電控', requiredQty: 1 },
      { id: 'bom-5', partName: '18650 4S 鋰電池組', category: '動力與電機', requiredQty: 1 },
      { id: 'bom-6', partName: '12V 降壓模組', category: '電子電控', requiredQty: 2 },
    ]
  },
  {
    id: 'proj-fpv-1',
    groupId: 'group-fpv',
    name: '5吋碳纖維競速機組裝案',
    description: '追求極致推重比的輕量化 6S 競速型穿越機組裝項目。',
    bomItems: [
      { id: 'bom-f1', partName: 'T-Motor Velox V2207 無刷馬達', category: '動力與電機', requiredQty: 4 },
      { id: 'bom-f2', partName: '5043 三葉槳片 (一包2對裝)', category: '結構五金', requiredQty: 2 },
      { id: 'bom-f3', partName: 'RunCam Link 鳳凰HD天空端套件', category: '電子電控', requiredQty: 1 },
      { id: 'bom-f4', partName: '5吋碳纖維穿越機機架', category: '結構五金', requiredQty: 1 },
      { id: 'bom-f5', partName: 'F722 雙端飛控與電調飛塔', category: '電子電控', requiredQty: 1 }
    ]
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  // RoboMaster Group Expense list
  {
    id: 'exp-rm-1',
    groupId: 'group-robomaster',
    title: '底盤高強度航空鋁件 CNC 加工',
    amount: 4500,
    paidById: 'mem-ahao',
    paidByName: '阿豪',
    splitWithIds: ['mem-ahao', 'mem-jialing', 'mem-xiaoming', 'mem-guanyu'],
    date: '2026-05-22T08:00:00Z',
    category: '結構打樣'
  },
  {
    id: 'exp-rm-2',
    groupId: 'group-robomaster',
    title: '螺絲、尼龍柱、墊片五金配件箱',
    amount: 400,
    paidById: 'mem-jialing',
    paidByName: '佳玲',
    splitWithIds: ['mem-ahao', 'mem-jialing', 'mem-xiaoming', 'mem-guanyu'],
    date: '2026-05-23T15:10:00Z',
    category: '損耗五金'
  },
  {
    id: 'exp-rm-3',
    groupId: 'group-robomaster',
    title: '4S 高能鋰電池 買二送一',
    amount: 2400,
    paidById: 'mem-xiaoming',
    paidByName: '小明',
    splitWithIds: ['mem-ahao', 'mem-jialing', 'mem-xiaoming', 'mem-guanyu'],
    date: '2026-05-25T11:45:00Z',
    category: '動力電池'
  },

  // FPV Group Expense list
  {
    id: 'exp-fpv-1',
    groupId: 'group-fpv',
    title: '社團共用無人機鋰電池防爆充電箱',
    amount: 1800,
    paidById: 'mem-achang',
    paidByName: '阿昌',
    splitWithIds: ['mem-achang', 'mem-kevin', 'mem-liting', 'mem-xiaopang'],
    date: '2026-05-25T09:00:00Z',
    category: '公共設備'
  },
  {
    id: 'exp-fpv-2',
    groupId: 'group-fpv',
    title: '場地租借防撞網與旗幟',
    amount: 1200,
    paidById: 'mem-kevin',
    paidByName: '凱文',
    splitWithIds: ['mem-achang', 'mem-kevin', 'mem-liting', 'mem-xiaopang'],
    date: '2026-05-26T14:20:00Z',
    category: '耗材場地'
  }
];

// Load and initialized state helpers
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading localStorage for key:', key, error);
    return defaultValue;
  }
};

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing localStorage for key:', key, error);
  }
};
