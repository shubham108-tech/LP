import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
    RiAddLine, RiCheckLine, RiCloseLine, RiArchiveLine, RiRefreshLine, 
    RiDownloadLine, RiFileExcel2Line, RiBarChartBoxLine, RiSearchLine,
    RiStore2Line, RiBookLine, RiPrinterLine, RiLockLine, RiLockUnlockLine,
    RiArrowUpDownLine, RiPieChartLine, RiUserSmileLine, RiPencilLine, RiDeleteBinLine
} from 'react-icons/ri';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
    Legend, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const StationaryAdmin = () => {
    const [items, setItems] = useState([]);
    const [requests, setRequests] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requests', 'ledger', 'reports'

    // Search & Filter states
    const [inventorySearch, setInventorySearch] = useState('');
    const [ledgerSearch, setLedgerSearch] = useState('');

    // Form states
    const [editingItem, setEditingItem] = useState(null);
    const [editingLedger, setEditingLedger] = useState(null);
    const [addingStockItem, setAddingStockItem] = useState(null);
    const [addStockAmount, setAddStockAmount] = useState('');
    const [addStockBill, setAddStockBill] = useState('');
    
    // Add Item Form
    const [newItemName, setNewItemName] = useState('');
    const [newCategory, setNewCategory] = useState('Consumable');
    const [newBillNumber, setNewBillNumber] = useState('');
    const [newTotalStock, setNewTotalStock] = useState('');
    const [newMinLimit, setNewMinLimit] = useState('5');
    const [newUnit, setNewUnit] = useState('pcs');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsRes, reqsRes, ledgerRes] = await Promise.all([
                api.get('/stationary/items'),
                api.get('/stationary/requests'),
                api.get('/stationary/ledger').catch(() => ({ data: [] }))
            ]);
            setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
            setRequests(Array.isArray(reqsRes.data) ? reqsRes.data : []);
            setLedger(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
        } catch (error) {
            toast.error('Failed to load stationary data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName || !newTotalStock) {
            return toast.error('Please enter Item Name and Total Stock');
        }
        try {
            await api.post('/stationary/items', {
                item_name: newItemName,
                category: newCategory,
                total_stock: Number(newTotalStock),
                min_stock_limit: Number(newMinLimit) || 5,
                unit: newUnit,
                bill_number: newBillNumber
            });
            toast.success('Stationary Item added successfully');
            setNewItemName('');
            setNewTotalStock('');
            setNewMinLimit('5');
            setNewBillNumber('');
            setNewUnit('pcs');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error adding item');
        }
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stationary item?')) return;
        try {
            await api.delete(`/stationary/items/${id}`);
            toast.success('Item deleted successfully');
            fetchData();
        } catch (error) {
            toast.error('Error deleting item');
        }
    };

    const handleRequestAction = async (id, status) => {
        if (!window.confirm(`Are you sure you want to mark this request as ${status}?`)) return;
        try {
            await api.put(`/stationary/requests/${id}`, { status });
            toast.success(`Request ${status} successfully`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || `Error marking request as ${status}`);
        }
    };

    const handleEditItemSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/stationary/items/${editingItem.id}`, {
                item_name: editingItem.item_name,
                category: editingItem.category,
                total_stock: Number(editingItem.total_stock),
                available_stock: Number(editingItem.available_stock),
                min_stock_limit: Number(editingItem.min_stock_limit),
                unit: editingItem.unit,
                bill_number: editingItem.bill_number
            });
            toast.success('Item updated successfully');
            setEditingItem(null);
            fetchData();
        } catch (error) {
            toast.error('Error updating item');
        }
    };

    const handleAddStockSubmit = async (e) => {
        e.preventDefault();
        if (!addStockAmount || Number(addStockAmount) <= 0) {
            return toast.error('Please enter a valid stock quantity to add');
        }
        try {
            await api.put(`/stationary/items/${addingStockItem.id}`, {
                add_stock: Number(addStockAmount),
                bill_number: addStockBill
            });
            toast.success(`Added ${addStockAmount} stock to ${addingStockItem.item_name}`);
            setAddingStockItem(null);
            setAddStockAmount('');
            setAddStockBill('');
            fetchData();
        } catch (error) {
            toast.error('Error adding stock');
        }
    };

    const handleEditLedgerSubmit = async (e) => {
        e.preventDefault();
        if (!editingLedger) return;
        try {
            await api.put(`/stationary/ledger/${editingLedger.id}`, {
                reference_no: editingLedger.reference_no,
                notes: editingLedger.notes,
                transaction_type: editingLedger.transaction_type,
                received_qty: Number(editingLedger.received_qty) || 0,
                issued_qty: Number(editingLedger.issued_qty) || 0
            });
            toast.success('Ledger entry updated successfully');
            setEditingLedger(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating ledger entry');
        }
    };

    const handleDeleteLedger = async (id) => {
        if (!window.confirm('Are you sure you want to delete this ledger log entry?')) return;
        try {
            await api.delete(`/stationary/ledger/${id}`);
            toast.success('Ledger entry deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting ledger entry');
        }
    };

    const handlePrintInvoice = (req) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Stationary Issue Voucher - ${req.id}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
                        .ticket { border: 2px solid #6366f1; padding: 30px; border-radius: 12px; max-width: 650px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                        .header { text-align: center; border-bottom: 2px solid #e2e8f0; pb-4; margin-bottom: 20px; }
                        .header h2 { color: #4f46e5; margin: 0 0 5px 0; font-size: 24px; }
                        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                        .approved { background: #dcfce7; color: #15803d; }
                        .pending { background: #fef3c7; color: #b45309; }
                        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .table th, .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                        .table th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; }
                        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; pt-4; }
                        .signature-line { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header">
                            <h2>LibraryPro Stationary Receipt</h2>
                            <p style="margin: 0; color: #64748b; font-size: 14px;">Official Stock Requisition & Issue Voucher</p>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 15px;">
                            <div><strong>Voucher No:</strong> REQ-${req.id}</div>
                            <div><strong>Date:</strong> ${new Date(req.requested_at).toLocaleString()}</div>
                        </div>
                        <div style="margin-bottom: 15px; font-size: 14px;">
                            <strong>Status:</strong> <span class="badge ${req.status === 'Approved' ? 'approved' : 'pending'}">${req.status}</span>
                        </div>

                        <h3 style="font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 25px;">Requisitioner Details</h3>
                        <table class="table">
                            <tr><th>Name</th><td><strong>${req.user_name}</strong></td></tr>
                            <tr><th>Email / Role</th><td>${req.user_email} (${req.user_role || 'User'})</td></tr>
                        </table>

                        <h3 style="font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Issued Item Details</h3>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Category</th>
                                    <th style="text-align: right;">Quantity Issued</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>${req.item_name}</strong></td>
                                    <td>${req.category}</td>
                                    <td style="text-align: right; font-weight: bold; color: #4f46e5;">${req.quantity} ${req.unit}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p style="font-size: 13px; color: #475569;"><strong>Purpose / Reason:</strong> ${req.reason || 'N/A'}</p>

                        <div class="signature-line">
                            <div>Issued By: Admin / Store In-charge</div>
                            <div>Receiver Signature: ______________</div>
                        </div>

                        <div class="footer">
                            Generated by LibraryPro Stationary System • Printed on ${new Date().toLocaleString()}
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const exportLedgerToCSV = () => {
        if (!ledger.length) return toast.error('No stock register data to export');
        const csvData = ledger.map(row => ({
            "Sr. No.": row.sr_no,
            "Date & Time": new Date(row.date).toLocaleString(),
            "Item Name": row.item_name,
            "Category": row.category,
            "Transaction Type": row.transaction_type,
            "Received Qty (+)": row.received_qty > 0 ? row.received_qty : 0,
            "Issued Qty (-)": row.issued_qty > 0 ? row.issued_qty : 0,
            "Balance Stock": row.balance,
            "Ref / Bill No / User": `${row.reference_no} (${row.user_name})`,
            "Notes": row.notes
        }));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        const keys = Object.keys(csvData[0]);
        csvContent += keys.join(",") + "\r\n";
        csvData.forEach(row => {
            const values = keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`);
            csvContent += values.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stationary_stock_register_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredItems = useMemo(() => {
        if (!inventorySearch) return items;
        return items.filter(item => 
            item.item_name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
            item.category.toLowerCase().includes(inventorySearch.toLowerCase()) ||
            (item.bill_number && item.bill_number.toLowerCase().includes(inventorySearch.toLowerCase()))
        );
    }, [items, inventorySearch]);

    const filteredLedger = useMemo(() => {
        if (!ledgerSearch) return ledger;
        return ledger.filter(row => 
            row.item_name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            row.transaction_type.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            row.reference_no.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            row.user_name.toLowerCase().includes(ledgerSearch.toLowerCase())
        );
    }, [ledger, ledgerSearch]);

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 flex items-center">
                <RiStore2Line className="mr-3 text-fuchsia-600" />
                Stationary Management
            </h1>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap space-x-2 md:space-x-4 mb-6 border-b border-purple-100 gap-y-2">
                <button
                    className={`pb-2 px-2 font-semibold text-sm flex items-center gap-2 transition ${
                        activeTab === 'inventory' 
                            ? 'border-b-2 border-fuchsia-600 text-fuchsia-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('inventory')}
                >
                    <RiArchiveLine size={18} />
                    Stock Inventory ({items.length})
                </button>
                <button
                    className={`pb-2 px-2 font-semibold text-sm flex items-center gap-2 relative transition ${
                        activeTab === 'requests' 
                            ? 'border-b-2 border-fuchsia-600 text-fuchsia-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('requests')}
                >
                    <RiBookLine size={18} />
                    Teacher Requests
                    {requests.filter(r => r.status === 'Pending').length > 0 && (
                        <span className="bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            {requests.filter(r => r.status === 'Pending').length}
                        </span>
                    )}
                </button>
                <button
                    className={`pb-2 px-2 font-semibold text-sm flex items-center gap-2 transition ${
                        activeTab === 'issue_logs' 
                            ? 'border-b-2 border-indigo-600 text-indigo-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('issue_logs')}
                >
                    <RiArrowUpDownLine size={18} />
                    📤 Issue & Dispatch Logs
                </button>
                <button
                    className={`pb-2 px-2 font-semibold text-sm flex items-center gap-2 transition ${
                        activeTab === 'purchase_logs' 
                            ? 'border-b-2 border-emerald-600 text-emerald-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('purchase_logs')}
                >
                    <RiStore2Line size={18} />
                    🛍️ Admin Purchase Register
                </button>
                <button
                    className={`pb-2 px-2 font-semibold text-sm flex items-center gap-2 transition ${
                        activeTab === 'reports' 
                            ? 'border-b-2 border-fuchsia-600 text-fuchsia-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('reports')}
                >
                    <RiBarChartBoxLine size={18} />
                    Analytics & Consumption
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-medium">
                    <RiRefreshLine className="animate-spin text-3xl text-indigo-600 mx-auto mb-2" />
                    Loading stationary data...
                </div>
            ) : activeTab === 'inventory' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Item Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit lg:col-span-1">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <RiAddLine className="text-indigo-600 text-xl" />
                            Add New Stationary Item
                        </h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Item Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="e.g. A4 Paper Rim / Blue Pens"
                                    value={newItemName}
                                    onChange={e => setNewItemName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                    >
                                        <option value="Consumable">Consumable</option>
                                        <option value="Returnable">Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unit</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="pcs / boxes / rims"
                                        value={newUnit}
                                        onChange={e => setNewUnit(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Total Stock</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="e.g. 100"
                                        value={newTotalStock}
                                        onChange={e => setNewTotalStock(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Min Alert Limit</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        placeholder="5"
                                        value={newMinLimit}
                                        onChange={e => setNewMinLimit(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Bill / Invoice No.</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="BILL-2026-XXXX"
                                    value={newBillNumber}
                                    onChange={e => setNewBillNumber(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <RiAddLine size={20} /> Add Item & Write Ledger
                            </button>
                        </form>
                    </div>

                    {/* Inventory Items List */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Current Stock Inventory</h2>
                            <div className="relative w-full sm:w-64">
                                <RiSearchLine className="absolute left-3 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search item or bill..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={inventorySearch}
                                    onChange={e => setInventorySearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                            {filteredItems.map(item => {
                                const isLowStock = item.available_stock <= item.min_stock_limit;
                                return (
                                    <div key={item.id} className="border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all bg-white flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-base">{item.item_name}</h3>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xl font-black ${isLowStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {item.available_stock}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-medium ml-1">/ {item.total_stock} {item.unit}</span>
                                                </div>
                                            </div>
                                            {item.bill_number && (
                                                <p className="text-xs text-slate-400 mb-2">Bill: <span className="font-medium text-slate-600">{item.bill_number}</span></p>
                                            )}
                                            {isLowStock && (
                                                <span className="text-[11px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded border border-rose-200">
                                                    Low Stock Alert (Min: {item.min_stock_limit})
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => {
                                                    setAddingStockItem(item);
                                                    setAddStockBill(item.bill_number || '');
                                                }}
                                                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-2 rounded-xl transition border border-emerald-200"
                                            >
                                                + Add Stock
                                            </button>
                                            <button
                                                onClick={() => setEditingItem(item)}
                                                className="px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl transition border border-slate-200"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold py-2 rounded-xl transition border border-rose-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                                    No inventory items found matching search.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'requests' ? (
                /* Requests Tab */
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Requisition & Issue Requests</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                                    <th className="p-3">Req ID & Date</th>
                                    <th className="p-3">User Details</th>
                                    <th className="p-3">Item Requested</th>
                                    <th className="p-3 text-center">Qty</th>
                                    <th className="p-3">Reason</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {requests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">#REQ-{req.id}</div>
                                            <div className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                                                <span>📅</span> {new Date(req.requested_at).toLocaleDateString()}
                                                <span>⏰</span> {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">{req.user_name}</div>
                                            <div className="text-xs text-slate-400">{req.user_email} ({req.user_role || 'user'})</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-semibold text-indigo-900">{req.item_name}</div>
                                            <div className="text-xs text-slate-400 uppercase font-medium">{req.category}</div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-indigo-600">
                                            {req.quantity} <span className="text-xs text-slate-400 font-normal">{req.unit}</span>
                                        </td>
                                        <td className="p-3 text-slate-600 max-w-xs truncate" title={req.reason}>
                                            {req.reason || '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                                req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                req.status === 'Returned' ? 'bg-blue-100 text-blue-800' :
                                                'bg-rose-100 text-rose-800'
                                            }`}>
                                                {req.status}
                                            </span>
                                            {req.acted_at ? (
                                                <div className="text-[11px] text-slate-500 font-mono mt-1">
                                                    Action: {new Date(req.acted_at).toLocaleDateString()} {new Date(req.acted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-amber-600 font-medium mt-1">Awaiting Action</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right space-x-1">
                                            {req.status === 'Pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleRequestAction(req.id, 'Approved')}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRequestAction(req.id, 'Rejected')}
                                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            {req.status === 'Approved' && (
                                                <button
                                                    onClick={() => handleRequestAction(req.id, 'Returned')}
                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                                                >
                                                    Mark Returned
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handlePrintInvoice(req)}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                                                title="Print Invoice / Receipt"
                                            >
                                                <RiPrinterLine size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-slate-400">No requests submitted yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'issue_logs' ? (
                /* Issue & Dispatch Logs (Teacher / Staff Requisition Issues) */
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <RiArrowUpDownLine className="text-indigo-600" />
                                📤 Stationary Issue & Dispatch Register
                            </h2>
                            <p className="text-xs text-slate-500">
                                Complete log of items issued to Teachers and Staff, showing exact Date & Time, Teacher Name, Quantity, and Balance.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <RiSearchLine className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter by teacher, item..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={ledgerSearch}
                                    onChange={e => setLedgerSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={exportLedgerToCSV}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
                            >
                                <RiDownloadLine size={16} /> Export Issue Log CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-indigo-950 text-white text-xs uppercase tracking-wider">
                                    <th className="p-3 rounded-tl-xl text-center">Sr. No.</th>
                                    <th className="p-3">Issue Date & Time</th>
                                    <th className="p-3">Teacher / Recipient</th>
                                    <th className="p-3">Item & Category</th>
                                    <th className="p-3 text-center">Action Type</th>
                                    <th className="p-3 text-right">Issued Qty (-)</th>
                                    <th className="p-3 text-right font-black">Balance Stock</th>
                                    <th className="p-3">Ref / Reason</th>
                                    <th className="p-3 rounded-tr-xl text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredLedger
                                    .filter(row => row.transaction_type === 'ISSUED' || row.transaction_type === 'RETURNED')
                                    .map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition">
                                            <td className="p-3 text-center font-bold text-slate-400 text-xs">
                                                #{idx + 1}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600">
                                                <div className="font-semibold text-slate-800">{new Date(row.date).toLocaleDateString()}</div>
                                                <div className="text-slate-400 font-mono">{new Date(row.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{row.user_name || 'Teacher / Staff'}</div>
                                                <div className="text-xs text-slate-400 capitalize">{row.user_role || 'teacher'}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{row.item_name}</div>
                                                <div className="text-xs text-slate-400 uppercase font-medium">{row.category}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                                                    row.transaction_type === 'ISSUED' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {row.transaction_type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-bold text-rose-600">
                                                -{row.issued_qty || row.received_qty} {row.unit}
                                            </td>
                                            <td className="p-3 text-right font-black text-indigo-700 text-base bg-indigo-50/50">
                                                {row.balance} <span className="text-xs font-normal text-slate-500">{row.unit}</span>
                                            </td>
                                            <td className="p-3 text-xs">
                                                <div className="font-semibold text-slate-700">{row.reference_no}</div>
                                                <div className="text-slate-400 max-w-xs truncate">{row.notes}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setEditingLedger(row)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Edit Entry"
                                                    >
                                                        <RiPencilLine size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLedger(row.id)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Delete Entry"
                                                    >
                                                        <RiDeleteBinLine size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {filteredLedger.filter(row => row.transaction_type === 'ISSUED' || row.transaction_type === 'RETURNED').length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="p-8 text-center text-slate-400">
                                            No stationary issue entries recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'purchase_logs' ? (
                /* Admin Purchase & Restock Register */
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <RiStore2Line className="text-emerald-600" />
                                🛍️ Admin Purchase & Restock Register
                            </h2>
                            <p className="text-xs text-slate-500">
                                Complete record of stationary items purchased or added by Admin with Bill Numbers, Quantity, Date & Time.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <RiSearchLine className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter by bill no, item..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={ledgerSearch}
                                    onChange={e => setLedgerSearch(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={exportLedgerToCSV}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition whitespace-nowrap"
                            >
                                <RiDownloadLine size={16} /> Export Purchase CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-emerald-950 text-white text-xs uppercase tracking-wider">
                                    <th className="p-3 rounded-tl-xl text-center">Sr. No.</th>
                                    <th className="p-3">Purchase Date & Time</th>
                                    <th className="p-3">Bill / Invoice No.</th>
                                    <th className="p-3">Item & Category</th>
                                    <th className="p-3 text-right">Purchased Qty (+)</th>
                                    <th className="p-3 text-right font-black">Stock Balance</th>
                                    <th className="p-3">Added By / Notes</th>
                                    <th className="p-3 rounded-tr-xl text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filteredLedger
                                    .filter(row => row.transaction_type === 'RECEIVED' || row.transaction_type === 'RESTOCK')
                                    .map((row, idx) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition">
                                            <td className="p-3 text-center font-bold text-slate-400 text-xs">
                                                #{idx + 1}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600">
                                                <div className="font-semibold text-slate-800">{new Date(row.date).toLocaleDateString()}</div>
                                                <div className="text-slate-400 font-mono">{new Date(row.date).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-mono font-bold rounded-lg text-xs">
                                                    {row.reference_no || 'NO-BILL'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{row.item_name}</div>
                                                <div className="text-xs text-slate-400 uppercase font-medium">{row.category}</div>
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-600 text-base">
                                                +{row.received_qty} {row.unit}
                                            </td>
                                            <td className="p-3 text-right font-black text-slate-800 text-base bg-slate-50">
                                                {row.balance} <span className="text-xs font-normal text-slate-500">{row.unit}</span>
                                            </td>
                                            <td className="p-3 text-xs text-slate-600">
                                                <div className="font-semibold text-slate-800">{row.user_name || 'Admin'}</div>
                                                <div className="text-slate-400 max-w-xs truncate">{row.notes}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setEditingLedger(row)}
                                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                        title="Edit Purchase Entry"
                                                    >
                                                        <RiPencilLine size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteLedger(row.id)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Delete Purchase Entry"
                                                    >
                                                        <RiDeleteBinLine size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                {filteredLedger.filter(row => row.transaction_type === 'RECEIVED' || row.transaction_type === 'RESTOCK').length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-slate-400">
                                            No purchase or restock entries recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Analytics & Reports Component */
                <StationaryReports />
            )}

            {/* Modals for Edit Item & Restock */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">Edit Stationary Item</h3>
                        <form onSubmit={handleEditItemSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Item Name</label>
                                <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={editingItem.item_name} onChange={e => setEditingItem({ ...editingItem, item_name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                                    <select className="w-full border rounded-xl p-2.5 text-sm" value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}>
                                        <option value="Consumable">Consumable</option>
                                        <option value="Returnable">Returnable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unit</label>
                                    <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={editingItem.unit} onChange={e => setEditingItem({ ...editingItem, unit: e.target.value })} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-900 uppercase mb-1">Available Pcs / Qty</label>
                                    <input type="number" className="w-full border border-indigo-200 rounded-xl p-2.5 text-sm font-bold text-indigo-700 bg-white focus:ring-2 focus:ring-indigo-500" value={editingItem.available_stock} onChange={e => setEditingItem({ ...editingItem, available_stock: e.target.value })} required min="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Stock (Pcs)</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500" value={editingItem.total_stock} onChange={e => setEditingItem({ ...editingItem, total_stock: e.target.value })} required min="0" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Alert Limit</label>
                                    <input type="number" className="w-full border rounded-xl p-2.5 text-sm" value={editingItem.min_stock_limit} onChange={e => setEditingItem({ ...editingItem, min_stock_limit: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Bill Number</label>
                                    <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={editingItem.bill_number || ''} onChange={e => setEditingItem({ ...editingItem, bill_number: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-md shadow-indigo-600/20">Update Item</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {addingStockItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-lg font-bold mb-2 text-slate-800">Add Stock to Inventory</h3>
                        <p className="text-xs text-slate-500 mb-4">Adding stock for <strong>{addingStockItem.item_name}</strong>. Current Available: {addingStockItem.available_stock} {addingStockItem.unit}</p>
                        <form onSubmit={handleAddStockSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity to Add (+)</label>
                                <input type="number" className="w-full border rounded-xl p-2.5 text-sm" value={addStockAmount} onChange={e => setAddStockAmount(e.target.value)} required min="1" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Bill / Invoice Number</label>
                                <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={addStockBill} onChange={e => setAddStockBill(e.target.value)} placeholder="BILL-2026-XXXX" />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setAddingStockItem(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold shadow-md shadow-emerald-600/20">Confirm & Record Ledger</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingLedger && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">Edit Stock Movement Log Entry</h3>
                        <form onSubmit={handleEditLedgerSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Item Name</label>
                                <input type="text" disabled className="w-full border rounded-xl p-2.5 text-sm bg-slate-100 font-semibold text-slate-700" value={editingLedger.item_name} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Transaction Type</label>
                                    <select className="w-full border rounded-xl p-2.5 text-sm bg-slate-50 font-medium" value={editingLedger.transaction_type} onChange={e => setEditingLedger({ ...editingLedger, transaction_type: e.target.value })}>
                                        <option value="RECEIVED">RECEIVED</option>
                                        <option value="ISSUED">ISSUED</option>
                                        <option value="RETURNED">RETURNED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ref / Bill Number</label>
                                    <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={editingLedger.reference_no} onChange={e => setEditingLedger({ ...editingLedger, reference_no: e.target.value })} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Received Qty (+)</label>
                                    <input type="number" min="0" className="w-full border rounded-xl p-2.5 text-sm text-emerald-700 font-bold" value={editingLedger.received_qty} onChange={e => setEditingLedger({ ...editingLedger, received_qty: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Issued Qty (-)</label>
                                    <input type="number" min="0" className="w-full border rounded-xl p-2.5 text-sm text-rose-700 font-bold" value={editingLedger.issued_qty} onChange={e => setEditingLedger({ ...editingLedger, issued_qty: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Notes / Description</label>
                                <textarea rows="2" className="w-full border rounded-xl p-2.5 text-sm" value={editingLedger.notes || ''} onChange={e => setEditingLedger({ ...editingLedger, notes: e.target.value })} placeholder="Add notes or reason..."></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setEditingLedger(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-md shadow-indigo-600/20">Save Ledger Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Analytics & Consumption Reports Component (For Admin & HOD)
const StationaryReports = () => {
    const [reportsData, setReportsData] = useState({ reports: [], topItems: [], categoryBreakdown: [] });
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [res, reqRes] = await Promise.all([
                api.get('/stationary/reports'),
                api.get('/stationary/requests')
            ]);
            setReportsData(res.data || { reports: [], topItems: [], categoryBreakdown: [] });
            setAllRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        } catch (error) {
            toast.error('Failed to load consumption analytics');
        } finally {
            setLoading(false);
        }
    };

    // User-wise Top Consumption Graph Data ("Kisne kya use kiya jada")
    const topUserConsumptionChart = useMemo(() => {
        if (!reportsData.reports || !reportsData.reports.length) return [];
        return reportsData.reports
            .map(r => ({
                name: r.user_name,
                total: Number(r.total_items_consumed || 0)
            }))
            .filter(r => r.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [reportsData]);

    // Top Consumed Items Chart Data
    const topItemsChartData = useMemo(() => {
        if (!reportsData.topItems || !reportsData.topItems.length) return [];
        return reportsData.topItems.map(item => ({
            name: item.item_name,
            total: Number(item.total_consumed)
        }));
    }, [reportsData]);

    // Category Pie Chart Data
    const categoryChartData = useMemo(() => {
        if (!reportsData.categoryBreakdown || !reportsData.categoryBreakdown.length) return [];
        return reportsData.categoryBreakdown.map(cat => ({
            name: cat.category,
            value: Number(cat.total_qty)
        }));
    }, [reportsData]);

    const handleToggleBlock = async (userId) => {
        if (!window.confirm('Are you sure you want to toggle stationary request access for this user?')) return;
        try {
            const res = await api.put(`/stationary/block/${userId}`);
            toast.success(res.data.message);
            fetchReports();
        } catch (error) {
            toast.error('Failed to update access block status');
        }
    };

    const fetchTeacherDetails = async (userId) => {
        setLoading(true);
        try {
            const res = await api.get(`/stationary/reports/${userId}`);
            setUserDetails(res.data);
            setSelectedUser(userId);
        } catch (error) {
            toast.error('Failed to load user details');
            setSelectedUser(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-10 text-slate-500 font-medium">Loading analytics graphs...</div>;

    if (selectedUser && userDetails) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">User Consumption Report: {userDetails.user.name}</h2>
                        <p className="text-xs text-slate-500">{userDetails.user.email} • Role: {userDetails.user.role}</p>
                    </div>
                    <button
                        onClick={() => setSelectedUser(null)}
                        className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
                    >
                        ← Back to All Reports
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                                <th className="p-3">Date</th>
                                <th className="p-3">Item</th>
                                <th className="p-3">Category</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3">Reason</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {userDetails.details.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-xs text-slate-600">
                                        {new Date(req.requested_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">{req.item_name}</td>
                                    <td className="p-3 text-xs text-slate-500 uppercase">{req.category}</td>
                                    <td className="p-3 text-center font-bold text-indigo-600">{req.quantity} {req.unit}</td>
                                    <td className="p-3 text-slate-600 text-xs">{req.reason || '-'}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                            req.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                            'bg-rose-100 text-rose-800'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graph 1: Who used what the most (Top Consuming Users) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <RiUserSmileLine className="text-fuchsia-600" />
                        Top Users by Consumption ("Kisne Kya Use Kiya Jada")
                    </h2>
                    <div className="h-64 w-full">
                        {topUserConsumptionChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topUserConsumptionChart} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="total" fill="#c026d3" radius={[6, 6, 0, 0]} name="Total Items Consumed" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No user consumption data available yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Graph 2: Top Consumed Stationary Items */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <RiBarChartBoxLine className="text-emerald-600" />
                        Top Consumed Stationary Items (Overall)
                    </h2>
                    <div className="h-64 w-full">
                        {topItemsChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topItemsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} name="Quantity Issued" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No item consumption data available.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* User Breakdown Table */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4">User-wise Requisition Breakdown</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                                <th className="p-3">User Name & Email</th>
                                <th className="p-3 text-center">Total Req.</th>
                                <th className="p-3 text-center">Approved</th>
                                <th className="p-3 text-center font-bold text-indigo-600">Total Consumed</th>
                                <th className="p-3">Top Consumed Item</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {reportsData.reports.map(report => (
                                <tr key={report.user_id} className="hover:bg-slate-50 transition">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{report.user_name}</div>
                                        <div className="text-xs text-slate-400">{report.user_email} ({report.user_role})</div>
                                    </td>
                                    <td className="p-3 text-center font-bold text-slate-600">{report.total_requests}</td>
                                    <td className="p-3 text-center font-bold text-emerald-600">{report.approved_requests}</td>
                                    <td className="p-3 text-center font-black text-indigo-700 text-base">{report.total_items_consumed}</td>
                                    <td className="p-3 text-xs font-semibold text-slate-700">{report.top_item || '-'}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => fetchTeacherDetails(report.user_id)}
                                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition border border-indigo-200"
                                        >
                                            Details
                                        </button>
                                        <button
                                            onClick={() => handleToggleBlock(report.user_id)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                                                report.is_blocked 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                            }`}
                                        >
                                            {report.is_blocked ? 'Unblock Access' : 'Block Access'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reportsData.reports.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400">No user consumption records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StationaryAdmin;
