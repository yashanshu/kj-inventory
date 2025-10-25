package handlers

import "hasufel.kj/internal/domain"

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
