import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { Item, MovementType } from '../../types/inventory';
import { useCreateMovement, useItemMovements } from '../../hooks/useInventory';
import { toast } from '../Toast';
import { formatDistanceToNow } from 'date-fns';

interface DesktopStockAdjustProps {
  item: Item;
  onClose: () => void;
}

export function DesktopStockAdjust({ item, onClose }: DesktopStockAdjustProps) {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<string>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const createMovement = useCreateMovement();
  const { data: movements, isLoading: movementsLoading } = useItemMovements(item.id);

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
      if (e.key === '1' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setMovementType('IN');
        }
      }
      if (e.key === '2' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setMovementType('OUT');
        }
      }
      if (e.key === '3' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setMovementType('ADJUSTMENT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await createMovement.mutateAsync({
        itemId: item.id,
        movementType,
        quantity: qty,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      const action =
        movementType === 'IN'
          ? 'added to'
          : movementType === 'OUT'
          ? 'removed from'
          : 'adjusted for';
      toast.success(`${qty} ${item.unit} ${action} ${item.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock. Please try again.');
    }
  };

  const stockLevel = (item.currentStock / (item.minimumThreshold * 2)) * 100;
  const recentMovements = movements?.slice(0, 5) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Stock Adjustment</h2>
            <p className="text-sm text-gray-500 mt-1">Make precise inventory adjustments</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Left Column - Adjustment Form */}
            <div className="space-y-6">
              {/* Item Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                {item.sku && <p className="text-sm text-gray-600 mb-3">SKU: {item.sku}</p>}

                {/* Stock Level Indicator */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Stock</span>
                    <span className="font-semibold text-gray-900">
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stockLevel < 50
                          ? 'bg-red-500'
                          : stockLevel < 100
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stockLevel, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Min: {item.minimumThreshold}</span>
                    <span>Target: {item.minimumThreshold * 2}</span>
                  </div>
                </div>
              </div>

              {/* Movement Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Movement Type
                  <span className="text-xs text-gray-500 ml-2">(1, 2, 3 keys)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMovementType('IN')}
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      movementType === 'IN'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Stock In</span>
                  </button>
                  <button
                    onClick={() => setMovementType('OUT')}
                    className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      movementType === 'OUT'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>Stock Out</span>
                  </button>
                  <button
                    onClick={() => setMovementType('ADJUSTMENT')}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      movementType === 'ADJUSTMENT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Adjust
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="Enter quantity"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {item.unit}
                  </span>
                </div>
                {quantity && !isNaN(parseInt(quantity)) && (
                  <p className="text-sm text-gray-600 mt-2">
                    New stock will be:{' '}
                    <span className="font-semibold">
                      {movementType === 'IN'
                        ? item.currentStock + parseInt(quantity)
                        : movementType === 'OUT'
                        ? Math.max(0, item.currentStock - parseInt(quantity))
                        : parseInt(quantity)}{' '}
                      {item.unit}
                    </span>
                  </p>
                )}
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                  <span className="text-xs text-gray-500 ml-2">(e.g., PO-123, INV-456)</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional reference number"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about this adjustment..."
                />
              </div>
            </div>

            {/* Right Column - Recent Activity */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent Movements
              </h3>
              <div className="space-y-2">
                {movementsLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : recentMovements.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent movements</p>
                ) : (
                  recentMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                movement.movementType === 'IN'
                                  ? 'bg-green-100 text-green-800'
                                  : movement.movementType === 'OUT'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {movement.movementType === 'IN' && <TrendingUp className="w-3 h-3 mr-1" />}
                              {movement.movementType === 'OUT' && <TrendingDown className="w-3 h-3 mr-1" />}
                              {movement.movementType}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {movement.quantity} {item.unit}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {movement.previousStock} → {movement.newStock} {item.unit}
                          </p>
                          {movement.reference && (
                            <p className="text-xs text-gray-500 mt-1">Ref: {movement.reference}</p>
                          )}
                          {movement.notes && (
                            <p className="text-xs text-gray-600 mt-1 italic">{movement.notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(movement.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Esc</kbd> to
            cancel,{' '}
            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Cmd+Enter</kbd>{' '}
            to submit
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={createMovement.isPending}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMovement.isPending || !quantity}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createMovement.isPending ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
