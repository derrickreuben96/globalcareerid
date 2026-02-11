export type UserRole = 'job_seeker' | 'employee' | 'employer' | 'recruiter';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

export type EmploymentStatus = 'pending' | 'active' | 'ended' | 'disputed';

export interface User {
  id: string;
  profileId: string; // Unique identifier like "TW-2024-XXXXX"
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  skills: string[];
  role: UserRole;
  createdAt: string;
  isVerified: boolean;
}

export interface Employer {
  id: string;
  companyName: string;
  registrationNumber: string;
  country: string;
  industry: string;
  email: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

export interface EmploymentRecord {
  id: string;
  userId: string;
  employerId: string;
  employerName: string;
  jobTitle: string;
  department?: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate?: string;
  status: EmploymentStatus;
  isDisputed: boolean;
  disputeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileShare {
  id: string;
  userId: string;
  sharedWithEmail?: string;
  accessCode: string;
  expiresAt?: string;
  viewCount: number;
  createdAt: string;
}
