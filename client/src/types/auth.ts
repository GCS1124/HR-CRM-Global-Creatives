export type UserRole = "admin" | "employee";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}
