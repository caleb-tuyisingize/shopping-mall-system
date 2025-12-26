import React, { useState, useEffect } from 'react';

const API = 'http://localhost/shopping-mall-system/kigali-mall/api/main.php';

export default function Dashboard({ onExportPDF }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total_items: 0,
    low_stock: 0,
    total_value: 0,
    today_sales_qty: 0,
    today_stock_in: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API}?action=analytics`),
        fetch(`${API}?action=dashboard_stats`)
      ]);

      setItems(await itemsRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color, change }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} text-2xl`}>
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <h3 className="text-2xl font-black text-gray-800">{value}</h3>
      <p className="text-sm text-gray-500 mt-1 font-medium">{title}</p>
    </div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">Dashboard Overview</h1>
          <p className="text-gray-500">Real-time inventory analytics and AI predictions</p>
        </div>
        <button
          onClick={() => onExportPDF(items)}
          className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition flex items-center gap-2 shadow-lg"
        >
          <span>📄</span> Export PDF Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Total Items"
          value={stats.total_items}
          icon="📦"
          color="bg-blue-500"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.low_stock}
          icon="⚠️"
          color="bg-red-500"
        />
        <StatCard
          title="Total Stock Value"
          value={`RWF ${(stats.total_value / 1000).toFixed(0)}K`}
          icon="💰"
          color="bg-green-500"
        />
        <StatCard
          title="Today's Sales"
          value={stats.today_sales_qty}
          icon="🛒"
          color="bg-purple-500"
        />
        <StatCard
          title="Stock Received Today"
          value={stats.today_stock_in}
          icon="📥"
          color="bg-orange-500"
        />
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-black mb-3 flex items-center gap-2">
              <span>🤖</span> AI Stock Forecasting
            </h2>
            <p className="text-blue-100 text-lg">
              Intelligent predictions based on 30-day sales patterns and burn rates
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Table with AI Predictions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-black text-gray-800">Current Inventory with AI Predictions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Item Name</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Category</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Current Stock</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Daily Burn Rate</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Days Until Stockout</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">AI Suggestion</th>
                <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">
                    No items found. Add items to see inventory analytics.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLowStock = item.current_quantity <= item.reorder_level;
                  const daysLeft = item.days_until_stockout || 999;
                  const needsRestock = daysLeft < 7;

                  return (
                    <tr key={item.item_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                      <td className="p-4 text-gray-500">{item.category_name || 'Uncategorized'}</td>
                      <td className="p-4">
                        <span className={`font-black text-lg ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>
                          {item.current_quantity}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">units</span>
                      </td>
                      <td className="p-4 text-gray-600">
                        {parseFloat(item.daily_burn_rate || 0).toFixed(2)} /day
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${needsRestock ? 'text-red-600' : 'text-green-600'}`}>
                          {daysLeft === 999 ? 'N/A' : `${daysLeft} days`}
                        </span>
                      </td>
                      <td className="p-4">
                        {needsRestock ? (
                          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                            Restock {item.suggested_reorder_qty || item.reorder_level * 3} units
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Stable</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isLowStock ? (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            Low Stock
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
