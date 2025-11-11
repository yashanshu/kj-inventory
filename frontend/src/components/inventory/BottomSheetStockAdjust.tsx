import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Minus, Plus } from 'lucide-react';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import type { Item, MovementType } from '../../types/inventory';
import { useCreateMovement } from '../../hooks/useInventory';
import { stockMovementSchema, type StockMovementFormData } from '../../schemas/inventory';

interface BottomSheetStockAdjustProps {
  item: Item;
  open: boolean;
  onClose: () => void;
}

export function BottomSheetStockAdjust({ item, open, onClose }: BottomSheetStockAdjustProps) {
  const createMovement = useCreateMovement();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<StockMovementFormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      movementType: 'IN',
      quantity: 1,
      notes: '',
    },
  });

  const movementType = watch('movementType');
  const quantity = watch('quantity');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: StockMovementFormData) => {
    try {
      await createMovement.mutateAsync({
        itemId: item.id,
        movementType: data.movementType,
        quantity: data.quantity,
        notes: data.notes || undefined,
      });

      const action =
        data.movementType === 'IN'
          ? 'added to'
          : data.movementType === 'OUT'
          ? 'removed from'
          : 'adjusted for';

      toast.success(`${data.quantity} ${item.unit} ${action} ${item.name}`);
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
    const current = quantity || 0;
    setValue('quantity', current + 1, { shouldValidate: true });
  };

  const decrementQuantity = () => {
    const current = quantity || 0;
    const minValue = movementType === 'ADJUSTMENT' ? 0 : 1;
    if (current > minValue) {
      setValue('quantity', current - 1, { shouldValidate: true });
    }
  };

  const newStock =
    movementType === 'IN'
      ? item.currentStock + (quantity || 0)
      : movementType === 'OUT'
      ? Math.max(0, item.currentStock - (quantity || 0))
      : quantity !== undefined && quantity !== null ? quantity : item.currentStock;

  return (
    <Drawer.Root open={open} onClose={handleClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[85vh] flex flex-col outline-none">
          {/* Handle Bar */}
          <div className="flex justify-center pt-3 pb-2">
            <Drawer.Handle className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b">
            <Drawer.Title className="text-xl font-semibold text-gray-900">
              Adjust Stock
            </Drawer.Title>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Item Info */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl">
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
                  type="button"
                  onClick={() => handleQuickAdjust(-5, 'OUT')}
                  disabled={createMovement.isPending}
                  className="aspect-square bg-red-50 text-red-600 rounded-2xl text-lg font-bold hover:bg-red-100 active:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(-1, 'OUT')}
                  disabled={createMovement.isPending}
                  className="aspect-square bg-red-100 text-red-600 rounded-2xl text-2xl font-bold hover:bg-red-200 active:bg-red-300 disabled:opacity-50 transition-colors"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdjust(1, 'IN')}
                  disabled={createMovement.isPending}
                  className="aspect-square bg-green-100 text-green-600 rounded-2xl text-2xl font-bold hover:bg-green-200 active:bg-green-300 disabled:opacity-50 transition-colors"
                >
                  +1
                </button>
                <button
                  type="button"
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
                {movementType === 'ADJUSTMENT' ? 'Set Stock Value' : 'Custom Amount'}
              </label>

              {/* Movement Type Pills */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setValue('movementType', 'IN', { shouldValidate: true })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                    movementType === 'IN'
                      ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  Stock In
                </button>
                <button
                  type="button"
                  onClick={() => setValue('movementType', 'OUT', { shouldValidate: true })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                    movementType === 'OUT'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  Stock Out
                </button>
                <button
                  type="button"
                  onClick={() => setValue('movementType', 'ADJUSTMENT', { shouldValidate: true })}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                    movementType === 'ADJUSTMENT'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  Adjust
                </button>
              </div>

              {/* Quantity Input with Steppers */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl active:bg-gray-200 disabled:opacity-50"
                  disabled={movementType === 'ADJUSTMENT' ? quantity <= 0 : quantity <= 1}
                >
                  <Minus className="w-5 h-5 text-gray-700" />
                </button>
                <input
                  type="number"
                  min={movementType === 'ADJUSTMENT' ? '0' : '1'}
                  {...register('quantity', { valueAsNumber: true })}
                  className="flex-1 min-w-0 text-center text-2xl font-bold px-2 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={incrementQuantity}
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-xl active:bg-gray-200"
                >
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Validation Error */}
              {errors.quantity && (
                <p className="mt-2 text-sm text-red-600">{errors.quantity.message}</p>
              )}

              {/* Preview */}
              {quantity !== undefined && quantity !== null && !isNaN(quantity) && (
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
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 resize-none"
                placeholder="Add a note about this adjustment..."
              />
              {errors.notes && (
                <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-white">
            <button
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={
                createMovement.isPending ||
                quantity === undefined ||
                quantity === null ||
                (movementType !== 'ADJUSTMENT' && quantity <= 0) ||
                (movementType === 'ADJUSTMENT' && quantity < 0)
              }
              className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 transition-all"
            >
              {createMovement.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
