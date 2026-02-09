// Orders page with table, search, and filters

import { useState, useMemo } from 'react';
import { Search, Filter, Package, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useOrders, useOrderStats } from '../hooks/useOrders';
import { ordersService, type Order } from '../services/orders';

// Format currency in INR
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

// Format date/time in IST
const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

// Platform badge colors
const platformColors: Record<string, string> = {
    swiggy: 'bg-orange-100 text-orange-800',
    zomato: 'bg-red-100 text-red-800',
};

// Status badge colors
const statusColors: Record<string, string> = {
    ordered: 'bg-blue-100 text-blue-800',
    placed: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600',
    default: 'bg-gray-100 text-gray-800',
};

interface OrderRowProps {
    order: Order;
}

function OrderRow({ order }: OrderRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const items = useMemo(() => ordersService.parseItems(order.itemsJson), [order.itemsJson]);

    return (
        <>
            <tr
                className="hover:bg-gray-50 cursor-pointer border-b border-gray-200"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="font-mono text-sm text-gray-600">
                            {order.externalOrderId.slice(-8)}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDateTime(order.orderDate)}
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${platformColors[order.platform] || 'bg-gray-100'}`}>
                        {order.platform}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                    {order.customerName || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {items.length} item{items.length !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(order.totalAmount)}
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status.toLowerCase()] || statusColors.default}`}>
                        {order.status}
                    </span>
                </td>
            </tr>

            {/* Expanded item details */}
            {isExpanded && items.length > 0 && (
                <tr className="bg-gray-50">
                    <td colSpan={7} className="px-8 py-4">
                        <div className="text-sm">
                            <h4 className="font-medium text-gray-700 mb-2">Order Items</h4>
                            <div className="space-y-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-gray-600">
                                        <span>{item.quantity}× {item.name}</span>
                                        <span className="text-gray-500">{formatCurrency(item.price)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

export function OrdersPage() {
    const [platform, setPlatform] = useState<string>('');
    const [search, setSearch] = useState('');
    const [limit] = useState(50);
    const [offset, setOffset] = useState(0);

    // Fetch orders
    const { data: orders = [], isLoading, refetch, isFetching } = useOrders({
        platform: platform || undefined,
        limit,
        offset,
    });

    // Fetch stats
    const { data: stats } = useOrderStats();

    // Client-side search filter (for customer name and order ID)
    const filteredOrders = useMemo(() => {
        if (!search.trim()) return orders;
        const searchLower = search.toLowerCase();
        return orders.filter(order =>
            order.customerName?.toLowerCase().includes(searchLower) ||
            order.externalOrderId.toLowerCase().includes(searchLower)
        );
    }, [orders, search]);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        View and search orders from Swiggy and Zomato
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-sm text-gray-500">Total Orders</div>
                        <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-sm text-gray-500">Total Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
                    </div>
                    <div className="bg-white rounded-lg border border-orange-200 p-4">
                        <div className="text-sm text-orange-600">Swiggy</div>
                        <div className="text-xl font-bold text-gray-900">{stats.swiggyOrders} orders</div>
                        <div className="text-sm text-gray-500">{formatCurrency(stats.swiggyRevenue)}</div>
                    </div>
                    <div className="bg-white rounded-lg border border-red-200 p-4">
                        <div className="text-sm text-red-600">Zomato</div>
                        <div className="text-xl font-bold text-gray-900">{stats.zomatoOrders} orders</div>
                        <div className="text-sm text-gray-500">{formatCurrency(stats.zomatoRevenue)}</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by customer name or order ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Platform filter */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={platform}
                        onChange={(e) => {
                            setPlatform(e.target.value);
                            setOffset(0);
                        }}
                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                        <option value="">All Platforms</option>
                        <option value="swiggy">Swiggy</option>
                        <option value="zomato">Zomato</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">Loading orders...</div>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Package className="w-12 h-12 mb-4 text-gray-300" />
                        <p>No orders found</p>
                        {search && <p className="text-sm mt-1">Try adjusting your search</p>}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Order ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Platform
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Items
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <OrderRow key={order.id} order={order} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <div className="text-sm text-gray-500">
                                Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setOffset(Math.max(0, offset - limit))}
                                    disabled={offset === 0}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setOffset(offset + limit)}
                                    disabled={orders.length < limit}
                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
