import { useState } from 'react';
import { Plus, Search, Package, Menu, Bell } from 'lucide-react';

// Mock data for demo - replace with API calls
const mockItems = [
  { id: '1', name: 'Paneer', category: 'Perishable Cold', currentStock: 3, minThreshold: 5, unit: 'kg', color: '#32CD32' },
  { id: '2', name: 'Tomato', category: 'Perishable Cold', currentStock: 8, minThreshold: 5, unit: 'kg', color: '#32CD32' },
  { id: '3', name: 'Garam Masala', category: 'Dry Consumables', currentStock: 0, minThreshold: 1, unit: 'kg', color: '#DAA520' },
  { id: '4', name: 'Oil', category: 'Dry Consumables', currentStock: 15, minThreshold: 10, unit: 'ltr', color: '#DAA520' },
  { id: '5', name: 'French Fries', category: 'Deep Cold', currentStock: 4, minThreshold: 5, unit: 'kg', color: '#4682B4' },
  { id: '6', name: '250ml Container', category: 'Packaging', currentStock: 80, minThreshold: 100, unit: 'pcs', color: '#9370DB' },
];

const categories = [
  { name: 'All', color: '#6B7280', count: mockItems.length },
  { name: 'Dry Items', color: '#8B4513', count: 0 },
  { name: 'Dry Consumables', color: '#DAA520', count: 2 },
  { name: 'Deep Cold', color: '#4682B4', count: 1 },
  { name: 'Perishable Cold', color: '#32CD32', count: 2 },
  { name: 'Packaging', color: '#9370DB', count: 1 },
];

function App() {
  const [items, setItems] = useState(mockItems);
  const [searchTerm, setSearchTerm] = useState<String>('');
  const [selectedCategory, setSelectedCategory] = useState<String>('All');
  const [showAddModal, setShowAddModal] = useState<Boolean>(false);
  const [showQuickAdjust, setShowQuickAdjust] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items.filter(item => item.currentStock <= item.minThreshold);
  const outOfStockItems = items.filter(item => item.currentStock === 0);

  const getStockStatus = (current, min) => {
    if (current === 0) return { status: 'out', color: 'bg-red-100 text-red-800', icon: '!' };
    if (current <= min) return { status: 'low', color: 'bg-yellow-100 text-yellow-800', icon: '⚠' };
    return { status: 'good', color: 'bg-green-100 text-green-800', icon: '✓' };
  };

  const handleQuickAdjust = (itemId, adjustment) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, currentStock: Math.max(0, item.currentStock + adjustment) }
        : item
    ));
    setShowQuickAdjust(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Inventory</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {lowStockItems.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="px-4 py-4 bg-white border-b">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{items.length}</div>
            <div className="text-xs text-gray-500">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
            <div className="text-xs text-gray-500">Out of Stock</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
            <div className="text-xs text-gray-500">Low Stock</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-3 bg-white border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.name
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: selectedCategory === category.name ? category.color : undefined
              }}
            >
              {category.name} {category.count > 0 && `(${category.count})`}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="px-4 py-4 space-y-3">
        {filteredItems.map((item) => {
          const stockStatus = getStockStatus(item.currentStock, item.minThreshold);
          
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
                      {stockStatus.icon}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.category}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-lg font-bold text-gray-900">
                      {item.currentStock} {item.unit}
                    </span>
                    <span className="text-sm text-gray-500">
                      Min: {item.minThreshold} {item.unit}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => setShowQuickAdjust(item.id)}
                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    Quick Adjust
                  </button>
                </div>
              </div>

              {/* Quick Adjust Panel */}
              {showQuickAdjust === item.id && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Quick Adjustment:</span>
                    <button
                      onClick={() => setShowQuickAdjust(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center space-x-3 mt-3">
                    <button
                      onClick={() => handleQuickAdjust(item.id, -1)}
                      className="w-10 h-10 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200 transition-colors"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(item.id, -5)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      -5
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-lg font-bold">{item.currentStock}</span>
                    </div>
                    <button
                      onClick={() => handleQuickAdjust(item.id, 5)}
                      className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(item.id, 1)}
                      className="w-10 h-10 bg-green-100 text-green-600 rounded-full font-bold hover:bg-green-200 transition-colors"
                    >
                      +1
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters' 
              : 'Add your first inventory item to get started'
            }
          </p>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Quick Add Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="Enter item name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Dry Items</option>
                  <option>Dry Consumables</option>
                  <option>Deep Cold</option>
                  <option>Perishable Cold</option>
                  <option>Packaging</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>kg</option>
                    <option>gm</option>
                    <option>ltr</option>
                    <option>ml</option>
                    <option>pcs</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Threshold</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;