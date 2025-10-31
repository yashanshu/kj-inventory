import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Item, MovementType } from '../../types/inventory';
import { useCreateMovement } from '../../hooks/useInventory';
import { toast } from '../Toast';

interface BottomSheetStockAdjustProps {
  item: Item;
  onClose: () => void;
}

export function BottomSheetStockAdjust({ item, onClose }: BottomSheetStockAdjustProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const createMovement = useCreateMovement();

  // Animate in
  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

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
      handleClose();
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
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to adjust stock. Please try again.');
    }
  };

  const incrementQuantity = () => {
    const current = parseInt(quantity) || 0;
    setQuantity(String(current + 1));
  };

  const decrementQuantity = () => {
    const current = parseInt(quantity) || 0;
    if (current > 1) {
      setQuantity(String(current - 1));
    }
  };

  // Swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchEnd - touchStart;

    // If swiped down more than 100px, close
    if (diff > 100) {
      handleClose();
    }

    setTouchStart(null);
  };

  const newStock =
    movementType === 'IN'
      ? item.currentStock + (parseInt(quantity) || 0)
      : movementType === 'OUT'
      ? Math.max(0, item.currentStock - (parseInt(quantity) || 0))
      : parseInt(quantity) || item.currentStock;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 transform transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Adjust Stock</h2>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Item Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl">
            <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-bold text-gray-900">{item.currentStock}</span>
              <span className="text-lg text-gray-600">{item.unit}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Current stock level</p>
          </div>

          {/* Quick Actions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Quick Actions
            </label>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => handleQuickAdjust(-5, 'OUT')}
                disabled={createMovement.isPending}
                className="aspect-square bg-red-50 text-red-600 rounded-2xl text-lg font-bold hover:bg-red-100 active:bg-red-200 disabled:opacity-50 transition-colors"
              >
                -5
              </button>
              <button
                onClick={() => handleQuickAdjust(-1, 'OUT')}
                disabled={createMovement.isPending}
                className="aspect-square bg-red-100 text-red-600 rounded-2xl text-2xl font-bold hover:bg-red-200 active:bg-red-300 disabled:opacity-50 transition-colors"
              >
                -1
              </button>
              <button
                onClick={() => handleQuickAdjust(1, 'IN')}
                disabled={createMovement.isPending}
                className="aspect-square bg-green-100 text-green-600 rounded-2xl text-2xl font-bold hover:bg-green-200 active:bg-green-300 disabled:opacity-50 transition-colors"
              >
                +1
              </button>
              <button
                onClick={() => handleQuickAdjust(5, 'IN')}
                disabled={createMovement.isPending}
                className="aspect-square bg-green-50 text-green-600 rounded-2xl text-lg font-bold hover:bg-green-100 active:bg-green-200 disabled:opacity-50 transition-colors"
              >
                +5
              </button>
            </div>
          </div>

          {/* Custom Adjustment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Custom Amount
            </label>

            {/* Movement Type Pills */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMovementType('IN')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                  movementType === 'IN'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                Stock In
              </button>
              <button
                onClick={() => setMovementType('OUT')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                  movementType === 'OUT'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                Stock Out
              </button>
              <button
                onClick={() => setMovementType('ADJUSTMENT')}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                  movementType === 'ADJUSTMENT'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                Adjust
              </button>
            </div>

            {/* Quantity Input with Steppers */}
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQuantity}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl active:bg-gray-200 disabled:opacity-50"
                disabled={parseInt(quantity) <= 1}
              >
                <Minus className="w-5 h-5 text-gray-700" />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 text-center text-2xl font-bold px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="0"
              />
              <button
                onClick={incrementQuantity}
                className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl active:bg-gray-200"
              >
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Preview */}
            {quantity && !isNaN(parseInt(quantity)) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">New stock will be:</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-gray-900">{newStock}</span>
                    <span className="text-sm text-gray-600">{item.unit}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none"
              placeholder="Add a note about this adjustment..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white">
          <button
            onClick={handleSubmit}
            disabled={createMovement.isPending || !quantity || parseInt(quantity) <= 0}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-2xl font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
          >
            {createMovement.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
          </button>
        </div>
      </div>
    </>
  );
}
