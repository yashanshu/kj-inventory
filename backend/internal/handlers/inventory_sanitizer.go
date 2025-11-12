package handlers

import "hasufel.kj/internal/domain"

// sanitizeItemDisplayForRole removes sensitive fields based on user role
func sanitizeItemDisplayForRole(item *domain.ItemDisplay, role domain.UserRole) *domain.ItemDisplay {
	if item == nil {
		return nil
	}

	if role != domain.RoleAdmin {
		item.UnitCost = nil
	}

	return item
}

// sanitizeItemsDisplayForRole sanitizes multiple items
func sanitizeItemsDisplayForRole(items []*domain.ItemDisplay, role domain.UserRole) []*domain.ItemDisplay {
	if len(items) == 0 {
		return items
	}

	for _, item := range items {
		sanitizeItemDisplayForRole(item, role)
	}
	return items
}

// Legacy functions for backward compatibility (can be removed if not used)
func sanitizeItemForRole(item *domain.Item, role domain.UserRole) *domain.Item {
	if item == nil {
		return nil
	}

	cloned := *item
	if item.Category != nil {
		categoryCopy := *item.Category
		cloned.Category = &categoryCopy
	}

	if role != domain.RoleAdmin {
		cloned.UnitCost = nil
	}

	return &cloned
}

func sanitizeItemsForRole(items []*domain.Item, role domain.UserRole) []*domain.Item {
	if len(items) == 0 {
		return items
	}

	result := make([]*domain.Item, 0, len(items))
	for _, it := range items {
		result = append(result, sanitizeItemForRole(it, role))
	}
	return result
}
