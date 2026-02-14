// Menu page - shows restaurant menu data with offers and categories

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { menuService, type MenuOffer, type MenuCategory, type MenuItem } from '../services/menu';
import { ChevronDown, ChevronRight, Tag, Leaf, CircleSlash, Clock } from 'lucide-react';

export function MenuPage() {
    const { data: menus, isLoading, error } = useQuery({
        queryKey: ['menus'],
        queryFn: () => menuService.getMenus(),
    });

    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Auto-select first restaurant
    useEffect(() => {
        if (menus && menus.length > 0 && !selectedRestaurantId) {
            setSelectedRestaurantId(menus[0].restaurantId);
        }
    }, [menus, selectedRestaurantId]);

    const selectedMenu = menus?.find(m => m.restaurantId === selectedRestaurantId);
    const offers = selectedMenu ? menuService.parseOffers(selectedMenu.offersJson) : [];
    const categories = selectedMenu ? menuService.parseCategories(selectedMenu.categoriesJson) : [];

    const toggleCategory = (name: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedCategories(new Set(categories.map(c => c.name)));
    };

    const collapseAll = () => {
        setExpandedCategories(new Set());
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 text-lg">Failed to load menu data</p>
                <p className="text-gray-500 mt-2">Please try again later</p>
            </div>
        );
    }

    if (!menus || menus.length === 0) {
        return (
            <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg font-medium">No menu data available yet</p>
                <p className="text-gray-500 mt-2">Menu data will be fetched daily at 6 PM IST</p>
            </div>
        );
    }

    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const vegItems = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.isVeg).length, 0);
    const inStockItems = categories.reduce((sum, cat) => sum + cat.items.filter(i => i.inStock).length, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Restaurant Menu</h1>
                    {selectedMenu && (
                        <p className="text-sm text-gray-500 mt-1">
                            Last updated: {new Date(selectedMenu.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </p>
                    )}
                </div>
                {menus.length > 1 && (
                    <select
                        value={selectedRestaurantId || ''}
                        onChange={(e) => {
                            setSelectedRestaurantId(e.target.value);
                            setExpandedCategories(new Set());
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {menus.map(m => (
                            <option key={m.restaurantId} value={m.restaurantId}>
                                {m.restaurantName || `Restaurant ${m.restaurantId}`}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Veg Items</p>
                    <p className="text-2xl font-bold text-green-600">{vegItems}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">In Stock</p>
                    <p className="text-2xl font-bold text-blue-600">{inStockItems}</p>
                </div>
            </div>

            {/* Offers */}
            {offers.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Active Offers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {offers.map((offer, idx) => (
                            <OfferCard key={idx} offer={offer} />
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Categories */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={expandAll}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Expand All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            onClick={collapseAll}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Collapse All
                        </button>
                    </div>
                </div>
                <div className="space-y-2">
                    {categories.map((category) => (
                        <CategorySection
                            key={category.name}
                            category={category}
                            isExpanded={expandedCategories.has(category.name)}
                            onToggle={() => toggleCategory(category.name)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function OfferCard({ offer }: { offer: MenuOffer }) {
    return (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-semibold text-gray-900">{offer.header}</p>
                    {offer.couponCode && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white border border-dashed border-orange-400 rounded text-xs font-mono text-orange-600">
                            {offer.couponCode}
                        </span>
                    )}
                    {offer.description && (
                        <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function CategorySection({ category, isExpanded, onToggle }: {
    category: MenuCategory;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-500">({category.itemCount})</span>
                </div>
            </button>
            {isExpanded && (
                <div className="border-t divide-y">
                    {category.items.map((item, idx) => (
                        <MenuItemRow key={idx} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MenuItemRow({ item }: { item: MenuItem }) {
    return (
        <div className={`px-4 py-3 flex items-start justify-between gap-4 ${!item.inStock ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {item.isVeg ? (
                        <Leaf className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                        <CircleSlash className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 truncate">{item.name}</span>
                    {!item.inStock && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex-shrink-0">Out of stock</span>
                    )}
                </div>
                {item.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                )}
                {item.variants.length > 0 && (
                    <div className="mt-1">
                        {item.variants.map((v, vi) => (
                            <span key={vi} className="text-xs text-gray-400">
                                {v.groupName}: {v.options.map(o => `${o.name} (₹${o.price})`).join(', ')}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                ₹{item.price.toFixed(0)}
            </span>
        </div>
    );
}
