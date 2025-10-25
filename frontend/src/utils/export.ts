import type { Item, Category } from '../types/inventory';

/**
 * Export items to CSV format
 */
export function exportItemsToCSV(
  items: Item[],
  categoryMap: Map<string, Category>,
  filename: string = 'inventory-export.csv'
) {
  // Define CSV headers
  const headers = [
    'Name',
    'SKU',
    'Category',
    'Current Stock',
    'Unit',
    'Minimum Threshold',
    'Unit Cost',
    'Total Value',
    'Status',
  ];

  // Convert items to CSV rows
  const rows = items.map((item) => {
    const category = categoryMap.get(item.categoryId);
    const totalValue = item.unitCost ? item.currentStock * item.unitCost : 0;
    const status =
      item.currentStock === 0
        ? 'Out of Stock'
        : item.currentStock <= item.minimumThreshold
        ? 'Low Stock'
        : 'In Stock';

    return [
      escapeCsvValue(item.name),
      escapeCsvValue(item.sku || ''),
      escapeCsvValue(category?.name || 'N/A'),
      item.currentStock,
      item.unit,
      item.minimumThreshold,
      item.unitCost?.toFixed(2) || '',
      totalValue.toFixed(2),
      status,
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV values that contain special characters
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string = 'inventory'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}-${timestamp}.csv`;
}
