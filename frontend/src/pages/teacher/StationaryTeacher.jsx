import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
    RiAddCircleLine, RiStore2Line, RiHistoryLine, RiBarChartBoxLine, 
    RiArchiveLine, RiSearchLine, RiCheckLine, RiTimeLine 
} from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const StationaryTeacher = () => {
    const [items, setItems] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'history'
    const [searchQuery, setSearchQuery] = useState('');

    // Form states
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [reason, setReason] = useState('');

    const itemConsumption = useMemo(() => {
        if (!requests.length) return [];
        const map = {};
        requests.filter(r => r.status === 'Approved').forEach(r => {
            map[r.item_name] = (map[r.item_name] || 0) + Number(r.quantity);
        });
        return Object.keys(map).map(k => ({ name: k, total: map[k] })).sort((a, b) => b.total - a.total);
    }, [requests]);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        return items.filter(item => 
            item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [items, searchQuery]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [itemsRes, reqsRes] = await Promise.all([
                api.get('/stationary/items'),
                api.get('/stationary/requests')
            ]);
            const itemsList = Array.isArray(itemsRes.data) ? itemsRes.data : [];
            setItems(itemsList);
            setRequests(Array.isArray(reqsRes.data) ? reqsRes.data : []);
            if (itemsList.length > 0) setSelectedItem(itemsList[0].id.toString());
        } catch (error) {
            toast.error('Failed to load stationary data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (e) => {
        e.preventDefault();
        if (!selectedItem) return toast.error('Please select an item');
        if (!quantity || Number(quantity) <= 0) return toast.error('Please enter a valid quantity');

        try {
            await api.post('/stationary/requests', {
                item_id: Number(selectedItem),
                quantity: Number(quantity),
                reason: reason
            });
            toast.success('Stationary Request submitted successfully!');
            setQuantity('1');
            setReason('');
            fetchData();
            setActiveTab('history');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error submitting request');
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-6 flex items-center">
                <RiStore2Line className="mr-3 text-fuchsia-600" />
                Stationary & Supplies
            </h1>

            {/* Navigation Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-purple-100">
                <button
                    className={`pb-2 px-1 font-semibold text-sm flex items-center gap-1 ${
                        activeTab === 'inventory' 
                            ? 'border-b-2 border-fuchsia-600 text-fuchsia-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('inventory')}
                >
                    <RiAddCircleLine size={18} /> Request Items
                </button>
                <button
                    className={`pb-2 px-1 font-semibold text-sm flex items-center gap-1 ${
                        activeTab === 'history' 
                            ? 'border-b-2 border-fuchsia-600 text-fuchsia-600 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab('history')}
                >
                    <RiHistoryLine size={18} /> My Requests ({requests.length})
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-500 font-medium">
                    Loading stationary catalog...
                </div>
            ) : activeTab === 'inventory' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Items Catalog List */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-lg font-bold text-slate-800">Available Inventory Catalog</h2>
                            <div className="relative w-full sm:w-64">
                                <RiSearchLine className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search pen, paper, markers..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
                            {filteredItems.map(item => {
                                const isSelected = selectedItem === item.id.toString();
                                const isOutOfStock = item.available_stock <= 0;
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => !isOutOfStock && setSelectedItem(item.id.toString())}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                            isSelected 
                                                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm' 
                                                : isOutOfStock 
                                                ? 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed'
                                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-800 text-sm">{item.item_name}</h3>
                                                {isSelected && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">Selected</span>}
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                                                {item.category}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex justify-between items-center pt-2 border-t border-slate-100">
                                            <span className="text-xs text-slate-500 font-medium">Available:</span>
                                            <span className={`text-base font-black ${isOutOfStock ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {item.available_stock} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                                    No matching items found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requisition Request Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit lg:col-span-1 sticky top-24">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <RiAddCircleLine className="text-indigo-600" /> Requisition Request
                        </h2>
                        <form onSubmit={handleRequest} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Stationary Item</label>
                                <select
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                    value={selectedItem}
                                    onChange={e => setSelectedItem(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>-- Select Item --</option>
                                    {items.map(item => (
                                        <option key={item.id} value={item.id} disabled={item.available_stock <= 0}>
                                            {item.item_name} ({item.available_stock} {item.unit} available)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity Required</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason / Course / Lab Purpose</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows="3"
                                    placeholder="Explain why you require this item..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <RiAddCircleLine size={20} /> Submit Requisition Request
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* History & Personal Analytics */
                <div className="space-y-6">
                    {/* Personal Consumption Chart & Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <RiBarChartBoxLine className="text-indigo-600" /> My Consumed Items Breakdown
                            </h3>
                            {itemConsumption.length > 0 ? (
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={itemConsumption} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} />
                                            <Bar dataKey="total" fill="#6366f1" radius={[0, 6, 6, 0]} name="Qty Consumed" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 py-8 text-center">No approved items issued yet.</p>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <RiArchiveLine className="text-emerald-600" /> Consumption Item List
                            </h3>
                            {itemConsumption.length > 0 ? (
                                <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                    {itemConsumption.map(item => (
                                        <li key={item.name} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                                            <span className="font-medium text-slate-700">{item.name}</span>
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">{item.total} units</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-400 py-8 text-center">No consumption summary available.</p>
                            )}
                        </div>
                    </div>

                    {/* Requests Table */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">My Requisition History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                                        <th className="p-3">Requested On</th>
                                        <th className="p-3">Item Requested</th>
                                        <th className="p-3 font-bold text-center">Quantity</th>
                                        <th className="p-3">Reason / Purpose</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {requests.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50">
                                            <td className="p-3 text-xs text-slate-600">
                                                <div className="font-semibold text-slate-800">{new Date(req.requested_at).toLocaleDateString()}</div>
                                                <div className="text-slate-400">{new Date(req.requested_at).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-800">{req.item_name}</div>
                                                <div className="text-xs text-slate-400 uppercase font-medium">{req.category}</div>
                                            </td>
                                            <td className="p-3 text-center font-bold text-indigo-600">
                                                {req.quantity} <span className="text-xs text-slate-400 font-normal">{req.unit}</span>
                                            </td>
                                            <td className="p-3 text-slate-600 text-xs max-w-xs truncate" title={req.reason}>
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
                                            </td>
                                        </tr>
                                    ))}
                                    {requests.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-400">
                                                You haven't submitted any stationary requests yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StationaryTeacher;
