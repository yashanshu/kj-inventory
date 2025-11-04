import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Minus,
  Plus,
  Shuffle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Item, MovementType } from '../../types/inventory';
import { useCreateMovement, useItemMovements } from '../../hooks/useInventory';
import { ResponsiveModal } from '../ResponsiveModal';
import { toast } from '../Toast';

interface StockAdjustModalProps {
  item: Item;
  onClose: () => void;
}

const movementOptions: Array<{
  value: MovementType;
  label: string;
  helper: string;
  shortcut: string;
  icon: typeof ArrowUpCircle;
  accentColor: string;
  bgColor: string;
  activeClass: string;
}> = [
  {
    value: 'IN',
    label: 'Stock In',
    helper: 'Increase available stock',
    shortcut: '1',
    icon: ArrowUpCircle,
    accentColor: 'text-green-600',
    bgColor: 'bg-green-50',
    activeClass: 'bg-green-600 text-white',
  },
  {
    value: 'OUT',
    label: 'Stock Out',
    helper: 'Reduce available stock',
    shortcut: '2',
    icon: ArrowDownCircle,
    accentColor: 'text-red-600',
    bgColor: 'bg-red-50',
    activeClass: 'bg-red-600 text-white',
  },
  {
    value: 'ADJUSTMENT',
    label: 'Adjust',
    helper: 'Set stock to a specific value',
    shortcut: '3',
    icon: Shuffle,
    accentColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    activeClass: 'bg-blue-600 text-white',
  },
];

const quickAdjustPresets = [5, 1, 1, 5] as const;

export function StockAdjustModal({ item, onClose }: StockAdjustModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<string>('1');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const createMovement = useCreateMovement();
  const { data: movements, isLoading: movementsLoading } = useItemMovements(item.id);

  const targetStock = Math.max(item.minimumThreshold * 2, 1);
  const stockLevel = Math.min(100, Math.round((item.currentStock / targetStock) * 100));

  const parsedQuantity = useMemo(() => {
    const parsed = parseInt(quantity, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [quantity]);

  const newStock = useMemo(() => {
    if (parsedQuantity == null) {
      return item.currentStock;
    }
    if (movementType === 'IN') {
      return item.currentStock + parsedQuantity;
    }
    if (movementType === 'OUT') {
      return Math.max(0, item.currentStock - parsedQuantity);
    }
    return parsedQuantity;
  }, [item.currentStock, movementType, parsedQuantity]);

  const recentMovements = movements?.slice(0, 5) ?? [];

  const handleSubmit = useCallback(async () => {
    const qty = parsedQuantity;
    if (qty == null || qty <= 0) {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ?? 'Failed to adjust stock. Please try again.');
    }
  }, [
    parsedQuantity,
    createMovement,
    item.id,
    item.unit,
    item.name,
    movementType,
    reference,
    notes,
    onClose,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleSubmit();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const activeTag = (event.target as HTMLElement).tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return;
      }

      if (event.key === '1') {
        setMovementType('IN');
      } else if (event.key === '2') {
        setMovementType('OUT');
      } else if (event.key === '3') {
        setMovementType('ADJUSTMENT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, onClose]);

  const handleQuickAdjust = async (delta: number, type: Extract<MovementType, 'IN' | 'OUT'>) => {
    let actualQuantity = Math.abs(delta);

    if (type === 'OUT') {
      actualQuantity = Math.min(actualQuantity, item.currentStock);
    }

    if (actualQuantity === 0) {
      toast.error('No stock available to remove');
      return;
    }

    try {
      await createMovement.mutateAsync({
        itemId: item.id,
        movementType: type,
        quantity: actualQuantity,
        notes: `Quick adjust: ${delta > 0 ? '+' : '-'}${actualQuantity}`,
      });
      const action = delta > 0 ? 'added to' : 'removed from';
      toast.success(`${actualQuantity} ${item.unit} ${action} ${item.name}`);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      toast.error(message ?? 'Failed to adjust stock. Please try again.');
    }
  };

  const isSubmitting = createMovement.isPending;
  const disableSubmit = isSubmitting || parsedQuantity == null || parsedQuantity <= 0;

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onClose}
      title="Adjust Stock"
      description="Make quick adjustments or log recent movements"
      maxHeight="90vh"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Esc</kbd> to cancel
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">⌘</kbd>/
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl</kbd>+
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd> to submit
            </span>
          </div>
          <div className="flex gap-3 sm:justify-end">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="stock-adjust-form"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disableSubmit}
            >
              {isSubmitting ? 'Adjusting...' : 'Confirm'}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="stock-adjust-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]"
      >
        <div className="space-y-6">
          {/* Item Overview */}
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Item overview
            </h3>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-gray-900">{item.name}</p>
                {item.sku && (
                  <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Current stock
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.currentStock} <span className="text-base text-gray-600">{item.unit}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${stockLevel}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Minimum: {item.minimumThreshold}</span>
                <span>Target: {targetStock}</span>
              </div>
            </div>
          </section>

          {/* Movement Type */}
          <section className="space-y-4 rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">
                Movement Type
              </label>
              <p className="text-xs text-gray-500">Press 1 / 2 / 3</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {movementOptions.map((option) => {
                const Icon = option.icon;
                const isActive = movementType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMovementType(option.value)}
                    className={`h-full justify-start gap-3 rounded-lg border p-3 text-left transition ${
                      isActive
                        ? option.activeClass
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? '' : option.accentColor}`} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-600'}`}>
                        {option.helper}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quick Adjust */}
          <section className="space-y-4 rounded-xl border border-dashed border-gray-300 p-5">
            <label className="text-sm font-semibold text-gray-900">
              Quick Adjust
            </label>
            <div className="grid grid-cols-4 gap-2">
              {quickAdjustPresets.map((preset, index) => {
                const isNegative = index < 2;
                const delta = isNegative ? -preset : preset;
                const type = isNegative ? 'OUT' : 'IN';
                const disabled =
                  isSubmitting || (type === 'OUT' && item.currentStock === 0);

                return (
                  <button
                    key={`${type}-${preset}-${index}`}
                    type="button"
                    onClick={() => void handleQuickAdjust(delta, type)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg border-2 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      isNegative
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {isNegative ? `-${preset}` : `+${preset}`}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quantity and Reference */}
          <section className="space-y-4 rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900">
                  Quantity <span className="text-red-600">*</span>
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    onClick={() => {
                      const current = parsedQuantity ?? 1;
                      const next = Math.max(current - 1, 1);
                      setQuantity(String(next));
                    }}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full px-3 py-2 text-lg font-semibold text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    required
                  />
                  <button
                    type="button"
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    onClick={() => {
                      const current = parsedQuantity ?? 0;
                      setQuantity(String(current + 1));
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-900">
                  Reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PO-123, INV-456"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Useful for associating adjustments with orders.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-900">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add extra context for this adjustment"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Projected stock
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {newStock} <span className="text-sm text-gray-600">{item.unit}</span>
              </p>
            </div>
          </section>
        </div>

        {/* Recent Movements Sidebar */}
        <aside className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Clock className="h-4 w-4" />
            Recent Movements
          </div>
          {movementsLoading ? (
            <p className="text-sm text-gray-600">Loading recent movements...</p>
          ) : recentMovements.length === 0 ? (
            <p className="text-sm text-gray-600">
              No movement history yet. Adjustments will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentMovements.map((movement) => (
                <li
                  key={movement.id}
                  className="rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          movement.movementType === 'IN'
                            ? 'bg-green-100 text-green-700'
                            : movement.movementType === 'OUT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {movement.movementType}
                      </span>
                      <p className="text-sm font-semibold text-gray-900">
                        {movement.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-gray-600">
                        {movement.previousStock} → {movement.newStock} {item.unit}
                      </p>
                      {movement.reference && (
                        <p className="text-xs text-gray-600">
                          Ref: {movement.reference}
                        </p>
                      )}
                      {movement.notes && (
                        <p className="text-xs text-gray-700 italic">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(movement.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </form>
    </ResponsiveModal>
  );
}
