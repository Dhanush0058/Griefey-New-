// Fix: Use scoped firebase package to resolve module export errors.
import { Timestamp } from '@firebase/firestore';

export interface User {
  uid: string;
  name: string;
  phone: string | null;
  email: string | null;
  preferred_language: Language;
  createdAt: number;
}

export type ComplaintCategory = 'Sanitation' | 'Electricity' | 'Roads' | 'Water Supply' | 'Other';

export enum ComplaintStatus {
  Submitted = "submitted",
  InProgress = "in_progress",
  Resolved = "resolved",
  Escalated = "escalated",
  Duplicate = "duplicate",
}

export interface Complaint {
  id: string; 
  userUid: string;
  title: string;
  description_original: string;
  description_en?: string;
  category: ComplaintCategory;
  subcategory?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  attachments: string[];
  status: ComplaintStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  department_id?: string | null;
  upvote_count: number;
  parent_ticket_id?: string | null;
  escalation_level: number;
  escalation_due: Timestamp;
  upvotedBy: string[];
  isAnonymous?: boolean;
}

export interface Draft {
    draftId: string;
    title: string;
    description: string;
    category: ComplaintCategory | '';
    subcategory?: string;
    location: { lat: number; lng: number } | null;
}

export type Language = 'en' | 'es' | 'hi';

// For clarity, renaming Ticket to Complaint, as it's more descriptive
export type Ticket = Complaint;

export interface Department {
  id: string;
  name: string;
}