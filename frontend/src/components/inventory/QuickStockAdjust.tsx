import { useState } from 'react';
import { X } from 'lucide-react';
import type { Item, MovementType } from '../../types/inventory';
import { useCreateMovement } from '../../hooks/useInventory';
import { toast } from '../Toast';

interface QuickStockAdjustProps {
  item: Item;
  onClose: () => void;
}

export function QuickStockAdjust({ item, onClose }: QuickStockAdjustProps) {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState('');

  const createMovement = useCreateMovement();

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
        notes: notes || undefined,
      });
      const action = movementType === 'IN' ? 'added to' : movementType === 'OUT' ? 'removed from' : 'adjusted for';
      toast.success(`${qty} ${item.unit} ${action} ${item.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock. Please try again.');
    }
  };

  const handleQuickAdjust = async (delta: number, type: MovementType) => {
    try {
      await createMovement.mutateAsync({
        itemId: item.id,
        movementType: type,
        quantity: Math.abs(delta),
        notes: `Quick adjustment: ${delta > 0 ? '+' : ''}${delta}`,
      });
      const action = delta > 0 ? 'added to' : 'removed from';
      toast.success(`${Math.abs(delta)} ${item.unit} ${action} ${item.name}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Quick Stock Adjust</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Item Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Current Stock: <span className="font-semibold">{item.currentStock} {item.unit}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Actions
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuickAdjust(-5, 'OUT')}
                disabled={createMovement.isPending}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
              >
                -5
              </button>
              <button
                onClick={() => handleQuickAdjust(-1, 'OUT')}
                disabled={createMovement.isPending}
                className="w-10 h-10 bg-red-100 text-red-600 rounded-full font-bold hover:bg-red-200 disabled:opacity-50"
              >
                -1
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-gray-900">{item.currentStock}</span>
              </div>
              <button
                onClick={() => handleQuickAdjust(1, 'IN')}
                disabled={createMovement.isPending}
                className="w-10 h-10 bg-green-100 text-green-600 rounded-full font-bold hover:bg-green-200 disabled:opacity-50"
              >
                +1
              </button>
              <button
                onClick={() => handleQuickAdjust(5, 'IN')}
                disabled={createMovement.isPending}
                className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50"
              >
                +5
              </button>
            </div>
          </div>

          {/* Custom Adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Adjustment
            </label>

            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => setMovementType('IN')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  movementType === 'IN'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stock In
              </button>
              <button
                onClick={() => setMovementType('OUT')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  movementType === 'OUT'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Stock Out
              </button>
              <button
                onClick={() => setMovementType('ADJUSTMENT')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  movementType === 'ADJUSTMENT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Adjust
              </button>
            </div>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add notes about this adjustment..."
            />
          </div>
        </div>

        <div className="flex space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            disabled={createMovement.isPending}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMovement.isPending}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {createMovement.isPending ? 'Adjusting...' : 'Adjust Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
