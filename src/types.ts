export interface Member {
  id: string;
  name: string;
  avatarColor: string; // Tailwind hex or class suffix
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: Member[];
}

export type PartStatus = 'available' | 'needed' | 'exchanged';

export interface PartListing {
  id: string;
  groupId: string;
  name: string;
  category: string;
  status: PartStatus;
  price: number;
  quantity: number;
  ownerId: string; // Member ID
  ownerName: string;
  description: string;
  createdAt: string;
  specification?: string;
}

export interface BOMItem {
  id: string;
  partName: string;
  category: string;
  requiredQty: number;
}

export interface Project {
  id: string;
  groupId: string;
  name: string;
  description: string;
  bomItems: BOMItem[];
}

export type SplitType = 'equal' | 'custom';

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidById: string; // Member ID who paid
  paidByName: string;
  splitWithIds: string[]; // Member IDs sharing the expense
  date: string;
  category: string;
}

// Result structure for who owes whom
export interface Settlement {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface UserBalance {
  memberId: string;
  memberName: string;
  paidAmount: number;    // Total amount paid by this user
  shareAmount: number;   // Total amount this user owes based on splits
  netBalance: number;    // paidAmount - shareAmount (positive means should receive/get back, negative means owes)
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'visitor' | 'school' | 'public' | 'admin';
  status: 'pending' | 'approved';
  createdAt: string;
}

