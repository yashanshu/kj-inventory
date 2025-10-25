import type { Role } from '../types/inventory';

export function isAdmin(role?: Role | null): boolean {
  return role === 'ADMIN';
}

export function canEditItems(role?: Role | null): boolean {
  return isAdmin(role);
}

export function canViewUnitCost(role?: Role | null): boolean {
  return isAdmin(role);
}

export function canManageCategories(role?: Role | null): boolean {
  return isAdmin(role);
}
