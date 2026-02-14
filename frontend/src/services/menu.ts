// Menu service for fetching restaurant menu data from API

import { apiClient } from './api';

export interface MenuOffer {
    header: string;
    couponCode: string;
    description: string;
    offerType: string;
}

export interface MenuItemVariantOption {
    name: string;
    price: number;
}

export interface MenuItemVariant {
    groupName: string;
    options: MenuItemVariantOption[];
}

export interface MenuItem {
    name: string;
    price: number;
    description: string;
    isVeg: boolean;
    imageId: string;
    inStock: boolean;
    variants: MenuItemVariant[];
}

export interface MenuCategory {
    name: string;
    itemCount: number;
    items: MenuItem[];
}

export interface RestaurantMenu {
    id: number;
    restaurantId: string;
    restaurantName?: string;
    offersJson?: string;
    categoriesJson?: string;
    fetchedAt: string;
    createdAt: string;
}

export const menuService = {
    async getMenus(): Promise<RestaurantMenu[]> {
        return apiClient.get<RestaurantMenu[]>('/menu');
    },

    async getMenu(restaurantId: string): Promise<RestaurantMenu> {
        return apiClient.get<RestaurantMenu>(`/menu/${restaurantId}`);
    },

    parseOffers(offersJson?: string): MenuOffer[] {
        if (!offersJson) return [];
        try {
            return JSON.parse(offersJson);
        } catch {
            return [];
        }
    },

    parseCategories(categoriesJson?: string): MenuCategory[] {
        if (!categoriesJson) return [];
        try {
            return JSON.parse(categoriesJson);
        } catch {
            return [];
        }
    },
};
