import React, { useState, useEffect } from 'react';

const API = 'http://localhost/shopping-mall-system/kigali-mall/api/main.php';

export default function StockManagement({ view, userId, onExportPDF }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // History state for the main History tab
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- NEW: MODAL STATES ---
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false); // Controls the "View List" popup
  const [listModalData, setListModalData] = useState([]);    // Holds data for the popup
  const [listModalType, setListModalType] = useState('');    // 'in', 'out', or 'items'
  // -------------------------

  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: ''
  });

  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    supplier_id: '',
    reason: 'sale',
    quantity_change: '',
    item_name: '',
    category_id: '',
    unit: 'pcs',
    selling_price: '',
    buying_price: '',
    reorder_level: '10',
    supplier_name: '',
    contact_info: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (view === 'history') {
        const [inRes, outRes] = await Promise.all([
          fetch(`${API}?action=stock_in_history`),
          fetch(`${API}?action=stock_out_history`)
        ]);
        const inData = await inRes.json();
        const outData = await outRes.json();
        setHistory([...outData, ...inData].sort((a, b) => {
          const dateA = new Date(a.stock_out_date || a.stock_in_date);
          const dateB = new Date(b.stock_out_date || b.stock_in_date);
          return dateB - dateA;
        }));
      } else {
        // Standard load for other views
        const [itemsRes, categoriesRes, suppliersRes] = await Promise.all([
          fetch(`${API}?action=get_items`),
          fetch(`${API}?action=get_categories`),
          fetch(`${API}?action=get_suppliers`)
        ]);
        setItems(await itemsRes.json());
        setCategories(await categoriesRes.json());
        if (view === 'stock-in' || view === 'suppliers') {
          setSuppliers(await suppliersRes.json());
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCTION TO OPEN LIST MODAL ---
  const openListModal = async (type) => {
    setListModalType(type);
    setShowListModal(true);
    setListModalData([]); // Clear previous data while loading
    
    try {
      let endpoint = '';
      if (type === 'in') endpoint = 'stock_in_history';
      if (type === 'out') endpoint = 'stock_out_history';
      if (type === 'items') endpoint = 'get_items';

      const res = await fetch(`${API}?action=${endpoint}`);
      const data = await res.json();
      setListModalData(data);
    } catch (error) {
      alert("Failed to load list data");
    }
  };
  // ----------------------------------------

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}?action=add_category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('Category added successfully!');
        setShowCategoryModal(false);
        setCategoryForm({ category_name: '', description: '' });
        loadData();
      } else {
        alert(data.error || 'Failed to add category');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let action = '';
      let payload = { ...formData, user_id: userId || 1 };

      switch (view) {
        case 'stock-in':
          action = 'stock_in';
          payload = {
            item_id: parseInt(formData.item_id),
            quantity: parseInt(formData.quantity),
            supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
            user_id: userId || 1,
            reference_no: `SI-${Date.now()}`
          };
          break;
        case 'stock-out':
          action = 'stock_out';
          payload = {
            item_id: parseInt(formData.item_id),
            quantity: parseInt(formData.quantity),
            reason: formData.reason,
            user_id: userId || 1,
            reference_no: `SO-${Date.now()}`
          };
          break;
        case 'adjustments':
          action = 'stock_adjust';
          payload = {
            item_id: parseInt(formData.item_id),
            quantity_change: parseInt(formData.quantity_change),
            reason: formData.reason || 'Adjustment',
            user_id: userId || 1
          };
          break;
        case 'items':
          action = 'add_item';
          payload = {
            item_name: formData.item_name,
            category_id: formData.category_id ? parseInt(formData.category_id) : null,
            unit: formData.unit,
            selling_price: parseFloat(formData.selling_price) || 0,
            buying_price: parseFloat(formData.buying_price) || 0,
            reorder_level: parseInt(formData.reorder_level) || 10
          };
          break;
      }

      const res = await fetch(`${API}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        alert(view === 'stock-out' && data.ebm_signature 
          ? `Transaction successful! EBM: ${data.ebm_signature}`
          : 'Operation successful!');
        
        setFormData({
          item_id: '',
          quantity: '',
          supplier_id: '',
          reason: 'sale',
          quantity_change: '',
          item_name: '',
          category_id: '',
          unit: 'pcs',
          selling_price: '',
          buying_price: '',
          reorder_level: '10'
        });
        
        loadData(); // REFRESH DATA to update stock levels immediately
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- REUSABLE LIST MODAL COMPONENT ---
  const ListModal = () => {
    if (!showListModal) return null;

    let title = '';
    if (listModalType === 'in') title = '📜 Stock In History';
    if (listModalType === 'out') title = '📜 Sales (Stock Out) History';
    if (listModalType === 'items') title = '📦 All Items Inventory';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <button 
              onClick={() => setShowListModal(false)}
              className="bg-white p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition shadow-sm"
            >
              ✕
            </button>
          </div>

          {/* Table Content */}
          <div className="p-0 overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {listModalType === 'in' && (
                    <>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Item</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Supplier</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Qty</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Received By</th>
                    </>
                  )}
                  {listModalType === 'out' && (
                    <>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Date</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Item</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Reason</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Qty</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">EBM Signature</th>
                    </>
                  )}
                  {listModalType === 'items' && (
                    <>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Item Name</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Category</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Stock</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Cost</th>
                      <th className="p-4 text-xs font-bold text-gray-600 uppercase">Price</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listModalData.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">No records found...</td></tr>
                ) : (
                  listModalData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {listModalType === 'in' && (
                        <>
                          <td className="p-4 text-sm">{new Date(row.stock_in_date).toLocaleString()}</td>
                          <td className="p-4 font-semibold text-gray-700">{row.item_name}</td>
                          <td className="p-4 text-sm text-gray-600">{row.supplier_name || '-'}</td>
                          <td className="p-4 font-bold text-green-600">+{row.quantity}</td>
                          <td className="p-4 text-sm text-gray-500">{row.received_by_name}</td>
                        </>
                      )}
                      {listModalType === 'out' && (
                        <>
                          <td className="p-4 text-sm">{new Date(row.stock_out_date).toLocaleString()}</td>
                          <td className="p-4 font-semibold text-gray-700">{row.item_name}</td>
                          <td className="p-4 text-sm capitalize">{row.reason}</td>
                          <td className="p-4 font-bold text-red-600">-{row.quantity}</td>
                          <td className="p-4 text-xs font-mono text-blue-600">{row.ebm_signature || 'N/A'}</td>
                        </>
                      )}
                      {listModalType === 'items' && (
                        <>
                          <td className="p-4 font-bold text-gray-800">{row.item_name}</td>
                          <td className="p-4 text-sm text-blue-600 bg-blue-50 w-fit rounded-lg px-2 py-1">{row.category_name}</td>
                          <td className={`p-4 font-bold ${Number(row.current_quantity) <= Number(row.reorder_level) ? 'text-red-600' : 'text-green-600'}`}>
                            {row.current_quantity} {row.unit}
                          </td>
                          <td className="p-4 text-sm text-gray-500">{row.buying_price}</td>
                          <td className="p-4 font-semibold text-gray-800">{row.selling_price}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
             <button onClick={() => setShowListModal(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-700 transition">Close</button>
          </div>
        </div>
      </div>
    );
  };
  // ----------------------------------------

  // STOCK IN VIEW
  if (view === 'stock-in') {
    return (
      <div className="p-8">
        <ListModal />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Stock In (Receive Items)</h1>
            <p className="text-gray-500">Record incoming stock from suppliers</p>
          </div>
          <button 
            onClick={() => openListModal('in')}
            className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm flex items-center gap-2"
          >
            <span>📜</span> View History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Item</label>
                  <select
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  >
                    <option value="">-- Select Item --</option>
                    {items.map(item => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_name} (Current: {item.current_quantity || 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Supplier</label>
                  <select
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  >
                    <option value="">-- Select Supplier (Optional) --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : '✓ Receive Stock'}
                </button>
              </div>
            </form>
          </div>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 h-fit">
            <h3 className="font-bold text-blue-900 mb-4">📥 Stock In Info</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Records items received from suppliers</li>
              <li>• Automatically updates inventory count</li>
              <li>• Tracks supplier information</li>
              <li>• Creates transaction history</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // STOCK OUT VIEW (POS/EBM)
  if (view === 'stock-out') {
    // FILTER: Only show items that have positive stock
    const availableItems = items.filter(item => Number(item.current_quantity) > 0);

    return (
      <div className="p-8">
        <ListModal />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Point of Sale (EBM)</h1>
            <p className="text-gray-500">Record sales with EBM signature generation</p>
          </div>
          <button 
            onClick={() => openListModal('out')}
            className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm flex items-center gap-2"
          >
            <span>📜</span> View Sales History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Item</label>
                  <select
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.item_id}
                    onChange={(e) => {
                       // Reset quantity when changing item to prevent invalid states
                       setFormData({ ...formData, item_id: e.target.value, quantity: '' });
                    }}
                  >
                    <option value="">-- Select Item to Sell --</option>
                    {availableItems.length === 0 ? (
                      <option disabled>⚠️ No items in stock! Go to Stock In first.</option>
                    ) : (
                      availableItems.map(item => (
                        <option key={item.item_id} value={item.item_id}>
                          {item.item_name} (Available: {item.current_quantity} {item.unit}) - RWF {item.selling_price}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    // Dynamic max value based on selected item's stock
                    max={items.find(i => i.item_id == formData.item_id)?.current_quantity || ''}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Enter quantity to sell"
                  />
                  {/* Visual helper for available stock */}
                  {formData.item_id && (
                     <p className="text-xs text-gray-500 mt-1">
                        Max quantity available: {items.find(i => i.item_id == formData.item_id)?.current_quantity || 0}
                     </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason</label>
                  <select
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  >
                    <option value="sale">Sale</option>
                    <option value="damage">Damage</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : '💰 Complete Sale (Generate EBM)'}
                </button>
              </div>
            </form>
          </div>
          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 h-fit">
            <h3 className="font-bold text-purple-900 mb-4">📤 EBM Sales Info</h3>
            <ul className="space-y-2 text-sm text-purple-800">
              <li>• Automatically generates EBM signature</li>
              <li>• RRA-compliant transaction recording</li>
              <li>• Updates inventory automatically</li>
              <li>• Full audit trail maintained</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ADJUSTMENTS VIEW
  if (view === 'adjustments') {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Stock Adjustments</h1>
            <p className="text-gray-500">Record damages, losses, or corrections</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Item</label>
                  <select
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.item_id}
                    onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                  >
                    <option value="">-- Select Item --</option>
                    {items.map(item => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_name} (Current: {item.current_quantity || 0})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quantity Change</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.quantity_change}
                    onChange={(e) => setFormData({ ...formData, quantity_change: e.target.value })}
                    placeholder="Use + for increase, - for decrease"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter positive number to add, negative to subtract</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g., Damaged goods, Found stock, etc."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : '⚙️ Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 h-fit">
            <h3 className="font-bold text-orange-900 mb-4">⚠️ Adjustments Info</h3>
            <ul className="space-y-2 text-sm text-orange-800">
              <li>• Record damaged or lost items</li>
              <li>• Correct inventory discrepancies</li>
              <li>• Add found stock</li>
              <li>• Maintain accurate records</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ITEMS MANAGEMENT VIEW
  if (view === 'items') {
    return (
      <div className="p-8">
        <ListModal />
        
        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Add New Category</h3>
                <button 
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-red-500 text-2xl"
                >
                  &times;
                </button>
              </div>
              
              <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    value={categoryForm.category_name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })}
                    placeholder="e.g., Electronics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    rows="3"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Optional description..."
                  ></textarea>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Items Management</h1>
            <p className="text-gray-500">Add and manage inventory items</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => openListModal('items')}
              className="bg-white border-2 border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition shadow-sm flex items-center gap-2"
            >
              <span>📦</span> View All Items
            </button>
            <button 
              onClick={() => setShowCategoryModal(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
            >
              <span>🗂️</span> Manage Categories
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    placeholder="e.g., Inyange Milk 1L"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                    <select
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(cat => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Unit</label>
                    <select
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="box">Box</option>
                      <option value="bag">Bag</option>
                      <option value="carton">Carton</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Buying Price (RWF)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={formData.buying_price}
                      onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Selling Price (RWF)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum stock level before reorder alert</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Adding...' : '➕ Add New Item'}
                </button>
              </div>
            </form>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">📦 Current Items ({items.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map(item => (
                  <div key={item.item_id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-semibold text-sm">{item.item_name}</p>
                    <p className="text-xs text-gray-500">
                      Stock: {item.current_quantity || 0} {item.unit} | 
                      Price: RWF {item.selling_price || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SUPPLIERS VIEW
  if (view === 'suppliers') {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Suppliers Management</h1>
            <p className="text-gray-500">Manage supplier information</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {suppliers.map(supplier => (
              <div key={supplier.supplier_id} className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg mb-2">{supplier.supplier_name}</h3>
                {supplier.phone && <p className="text-sm text-gray-600">📞 {supplier.phone}</p>}
                {supplier.contact_info && <p className="text-sm text-gray-500 mt-2">{supplier.contact_info}</p>}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-bold text-gray-900 mb-4">Add New Supplier</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              alert('Add supplier functionality - implement backend endpoint');
            }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Supplier Name"
                className="p-3 border-2 border-gray-200 rounded-lg"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Phone"
                className="p-3 border-2 border-gray-200 rounded-lg"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <button type="submit" className="bg-blue-600 text-white py-3 rounded-lg font-bold">
                Add Supplier
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // HISTORY VIEW
  if (view === 'history') {
    return (
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-800 mb-2">Transaction History</h1>
            <p className="text-gray-500">View all stock movements and EBM transactions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Date</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Type</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Item</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">Quantity</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">EBM Signature</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-600 uppercase">User</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                      No transaction history found
                    </td>
                  </tr>
                ) : (
                  history.map((transaction, idx) => {
                    const isStockIn = transaction.stock_in_id;
                    const date = transaction.stock_out_date || transaction.stock_in_date;
                    
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-sm">{new Date(date).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isStockIn 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {isStockIn ? 'IN' : 'OUT'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold">{transaction.item_name}</td>
                        <td className="p-4">{transaction.quantity}</td>
                        <td className="p-4 font-mono text-xs text-blue-600">
                          {transaction.ebm_signature || '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {transaction.received_by_name || transaction.issued_by_name || '-'}
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

  return null;
}