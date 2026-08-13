import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
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

const ExportButtonsGroup = ({ title, dataList, sectionName, exportDataToCSV, generatePDFReport }) => (
    <div className="flex items-center gap-2">
        <button
            onClick={() => exportDataToCSV(title, dataList, sectionName)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition whitespace-nowrap"
            title="Export Excel-optimized CSV"
        >
            <RiFileExcel2Line size={15} /> Export CSV
        </button>
        <button
            onClick={() => generatePDFReport(title, dataList, sectionName)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
            title="Generate 3D Boxed PDF / Print Report"
        >
            <RiPrinterLine size={15} /> PDF / Print Report
        </button>
    </div>
);

const StationaryAdmin = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [items, setItems] = useState([]);
    const [requests, setRequests] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requests', 'ledger', 'reports'
  // Bulk selection state for request table
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('Approved');

    // Search & Filter states
    const [inventorySearch, setInventorySearch] = useState('');
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [requestSearch, setRequestSearch] = useState('');
    const [requestStatusFilter, setRequestStatusFilter] = useState('All');

    // Form states
    const [editingItem, setEditingItem] = useState(null);
    const [editingRequest, setEditingRequest] = useState(null);
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

    const handleDeleteRequest = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stationary request?')) return;
        try {
            await api.delete(`/stationary/requests/${id}`);
            toast.success('Request deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error deleting request');
        }
    };

  // Handler for bulk approve/reject actions
  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.put('/stationary/requests/bulk-update', {
        ids: selectedIds,
        status: bulkStatus,
      });
      toast.success(`${bulkStatus} applied to ${selectedIds.length} request${selectedIds.length !== 1 ? 's' : ''}`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    }
  };

    const handleEditRequestSubmit = async (e) => {
        e.preventDefault();
        if (!editingRequest) return;
        try {
            await api.put(`/stationary/requests/${editingRequest.id}`, {
                status: editingRequest.status,
                quantity: Number(editingRequest.quantity),
                unit: editingRequest.unit,
                reason: editingRequest.reason
            });
            toast.success('Request updated successfully');
            setEditingRequest(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error updating request');
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
        if (!printWindow) {
            return toast.error('Popup blocked! Please allow popups for this site in your browser settings to print receipts.');
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Stationary Issue Voucher - REQ-${req.id}</title>
                    <style>
                        @media print {
                            .no-print { display: none !important; }
                            body { padding: 0; background: #fff; }
                            .ticket { box-shadow: none !important; border: 2px solid #000 !important; }
                        }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; }
                        .no-print-bar { display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 12px 20px; border-radius: 10px; margin: 0 auto 20px auto; max-width: 650px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
                        .btn-print { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }
                        .btn-close { background: #e2e8f0; color: #334155; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-left: 8px; font-size: 13px; }
                        .ticket { border: 2px solid #6366f1; padding: 30px; border-radius: 12px; max-width: 650px; margin: 0 auto; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                        .header h2 { color: #4f46e5; margin: 0 0 5px 0; font-size: 24px; }
                        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                        .approved { background: #dcfce7; color: #15803d; }
                        .pending { background: #fef3c7; color: #b45309; }
                        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        .table th, .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                        .table th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; }
                        .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
                        .signature-line { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="no-print-bar no-print">
                        <span style="font-weight: bold; font-size: 13px; color: #334155;">📄 Stationary Issue Voucher Preview</span>
                        <div>
                            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
                            <button class="btn-close" onclick="window.close()">Close</button>
                        </div>
                    </div>
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
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (e) {
                console.error('Print preview launch error:', e);
            }
        }, 300);
    };

    const exportDataToCSV = (title, dataList, sectionName = 'General') => {
        if (!dataList || !dataList.length) return toast.error(`No ${title.toLowerCase()} records to export`);

        let totalQty = 0;
        const formattedRows = dataList.map((row, idx) => {
            const qty = Number(row.received_qty || row.issued_qty || row.quantity || 0);
            totalQty += qty;

            const reqDateStr = row.requested_at || row.date;
            const reqDateTime = reqDateStr ? new Date(reqDateStr).toLocaleString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }) : 'N/A';

            const issueDateStr = row.acted_at || (['Approved', 'Returned', 'ISSUED'].includes(row.status || row.transaction_type) ? row.date : null);
            const issueDateTime = issueDateStr ? new Date(issueDateStr).toLocaleString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }) : (row.status === 'Pending' ? 'Awaiting Action' : 'N/A');

            return {
                "Sr. No.": `#${idx + 1}`,
                "Voucher / Ref No.": row.id ? `#REQ-${row.id}` : (row.reference_no || row.bill_number || 'N/A'),
                "Stationary Item Name": row.item_name || 'N/A',
                "Category": row.category || 'N/A',
                "Requisition Date & Time": reqDateTime,
                "Issue / Action Date & Time": issueDateTime,
                "Quantity": qty,
                "Unit": row.unit || 'pcs',
                "Stock Balance": row.balance !== undefined ? `${row.balance} ${row.unit || 'pcs'}` : 'N/A',
                "Teacher / Recipient": row.user_name || 'Admin',
                "Email & Role": row.user_email ? `${row.user_email} (${row.user_role || 'User'})` : (row.user_role || 'Staff/Admin'),
                "Status / Action": row.status || row.transaction_type || 'N/A',
                "Reason / Notes": row.reason || row.notes || 'N/A'
            };
        });

        // UTF-8 BOM prefix \uFEFF for perfect Excel rendering
        let csvString = "\uFEFF";
        csvString += `"=========================================================================================="\r\n`;
        csvString += `"LIBRARYPRO - OFFICIAL MANAGEMENT REPORT"\r\n`;
        csvString += `"Report Title:","${title.toUpperCase().replace(/"/g, '""')}"\r\n`;
        csvString += `"Section / Department:","${sectionName.replace(/"/g, '""')}"\r\n`;
        csvString += `"Generated Date & Time:","${new Date().toLocaleString()}"\r\n`;
        csvString += `"Total Records:","${dataList.length}"\r\n`;
        csvString += `"=========================================================================================="\r\n\r\n`;

        const keys = Object.keys(formattedRows[0]);
        csvString += keys.map(k => `"${k.replace(/"/g, '""')}"`).join(",") + "\r\n";

        formattedRows.forEach(row => {
            const values = keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`);
            csvString += values.join(",") + "\r\n";
        });

        csvString += `\r\n"=========================================================================================="\r\n`;
        csvString += `"SUMMARY TOTALS"\r\n`;
        csvString += `"Total Records Exported:","${dataList.length}"\r\n`;
        csvString += `"Total Quantity Sum:","${totalQty}"\r\n`;
        csvString += `"Document Status:","Official Confidential Export"\r\n`;
        csvString += `"=========================================================================================="\r\n`;

        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`${title} exported to CSV!`);
    };

    const generatePDFReport = (reportTitle, dataList, sectionName = 'General') => {
        if (!dataList || !dataList.length) return toast.error(`No data to generate ${reportTitle}`);

        let totalQty = 0;
        let totalRecords = dataList.length;

        // Group data list by Stationary Item Name
        const itemGroups = dataList.reduce((acc, row) => {
            const itemName = row.item_name || 'General Stationary';
            if (!acc[itemName]) {
                acc[itemName] = {
                    category: row.category || 'N/A',
                    unit: row.unit || 'pcs',
                    items: [],
                    totalQty: 0
                };
            }
            const qty = Number(row.received_qty || row.issued_qty || row.quantity || 0);
            acc[itemName].items.push(row);
            acc[itemName].totalQty += qty;
            totalQty += qty;
            return acc;
        }, {});

        const uniqueStationaryCount = Object.keys(itemGroups).length;
        const uniqueUsersCount = new Set(dataList.map(r => r.user_name || r.user_email).filter(Boolean)).size;

        const itemGroupsHtml = Object.entries(itemGroups).map(([itemName, group]) => {
            const tableRows = group.items.map((row, idx) => {
                const qty = row.received_qty || row.issued_qty || row.quantity || 0;
                const status = row.status || row.transaction_type || 'N/A';

                let badgeClass = 'badge-amber';
                if (['RECEIVED', 'RESTOCK', 'Approved'].includes(status)) badgeClass = 'badge-green';
                if (['ISSUED', 'Rejected'].includes(status)) badgeClass = 'badge-red';
                if (['Returned'].includes(status)) badgeClass = 'badge-blue';

                const reqDateStr = row.requested_at || row.date;
                const reqDateHtml = reqDateStr ? `
                    <div style="font-weight: 600; color: #1e293b;">📅 ${new Date(reqDateStr).toLocaleDateString()}</div>
                    <div style="font-size: 10px; color: #64748b;">⏰ ${new Date(reqDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                ` : 'N/A';

                const issueDateStr = row.acted_at || (['Approved', 'Returned', 'ISSUED'].includes(status) ? row.date : null);
                const issueDateHtml = issueDateStr ? `
                    <div style="font-weight: 600; color: #15803d;">📅 ${new Date(issueDateStr).toLocaleDateString()}</div>
                    <div style="font-size: 10px; color: #15803d;">⏰ ${new Date(issueDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                ` : (status === 'Pending' ? '<span style="font-size: 11px; color: #b45309; font-weight: 600;">⏳ Awaiting Action</span>' : '<span style="color: #94a3b8;">-</span>');

                const refNo = row.id ? `#REQ-${row.id}` : (row.reference_no || row.bill_number || 'N/A');

                return `
                    <tr>
                        <td style="text-align: center; font-weight: bold; color: #475569;">#${idx + 1}</td>
                        <td><span style="font-family: monospace; font-weight: bold; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${refNo}</span></td>
                        <td>${reqDateHtml}</td>
                        <td>${issueDateHtml}</td>
                        <td>
                            <strong>${row.user_name || 'Admin'}</strong>
                            ${row.user_email ? `<br><small style="color: #64748b;">${row.user_email} (${row.user_role || 'User'})</small>` : ''}
                        </td>
                        <td style="text-align: right; font-weight: 800; color: #4338ca;">${qty} ${group.unit}</td>
                        <td style="text-align: right; font-weight: 700; color: #0f766e;">${row.balance !== undefined ? row.balance + ' ' + group.unit : '-'}</td>
                        <td style="text-align: center;"><span class="badge ${badgeClass}">${status}</span></td>
                        <td style="font-size: 11px; color: #334155;">${row.reason || row.notes || '-'}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="item-group-box">
                    <div class="item-group-header">
                        <div>
                            <span class="item-icon">📦</span>
                            <strong class="item-title">${itemName}</strong>
                            <span class="item-category-tag">${group.category}</span>
                        </div>
                        <div class="item-summary-pills">
                            <span class="pill pill-qty">Total Qty: <strong>${group.totalQty} ${group.unit}</strong></span>
                            <span class="pill pill-count">Requests: <strong>${group.items.length}</strong></span>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 35px; text-align: center;">Sr.</th>
                                <th style="width: 90px;">Req / Ref No.</th>
                                <th style="width: 110px;">Requisition Date & Time</th>
                                <th style="width: 110px;">Issue Date & Time</th>
                                <th>Teacher / Recipient</th>
                                <th style="width: 80px; text-align: right;">Quantity</th>
                                <th style="width: 75px; text-align: right;">Stock Bal</th>
                                <th style="width: 75px; text-align: center;">Status</th>
                                <th>Reason / Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                            <tr class="item-subtotal-row">
                                <td colspan="5" style="text-align: right; font-weight: bold; color: #1e1b4b;">Subtotal for ${itemName}:</td>
                                <td style="text-align: right; font-weight: 900; color: #4338ca;">${group.totalQty} ${group.unit}</td>
                                <td colspan="3"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            return toast.error('Popup blocked! Please allow popups for this site to generate PDF reports.');
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${reportTitle} - LibraryPro Executive Report</title>
                    <style>
                        @page { size: A4 portrait; margin: 10mm; }
                        @media print {
                            .no-print { display: none !important; }
                            body { padding: 0; background: #fff; }
                            .item-group-box { page-break-inside: avoid; }
                        }
                        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; background: #fff; }
                        
                        .no-print-bar { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #cbd5e1; }
                        .btn-print { background: #4f46e5; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
                        .btn-close { background: #cbd5e1; color: #334155; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-left: 8px; font-size: 13px; }

                        /* Report Header Banner */
                        .header-banner { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
                        .org-logo { font-size: 24px; font-weight: 900; color: #4338ca; letter-spacing: -0.5px; }
                        .report-heading { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
                        .report-meta { text-align: right; font-size: 12px; color: #475569; line-height: 1.5; }
                        
                        /* 3D Boxed Stat Cards */
                        .summary-grid { display: flex; gap: 12px; margin-bottom: 22px; }
                        .stat-card { flex: 1; border: 2px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #f8fafc; box-shadow: 0 4px 8px rgba(0,0,0,0.04); }
                        .stat-title { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
                        .stat-val { font-size: 18px; font-weight: 900; color: #1e1b4b; margin-top: 2px; }

                        /* Item Group 3D Box Styling */
                        .item-group-box { border: 2px solid #cbd5e1; border-radius: 12px; overflow: hidden; margin-bottom: 22px; box-shadow: 0 4px 10px rgba(0,0,0,0.04); background: #ffffff; }
                        .item-group-header { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 10px 16px; border-bottom: 2px solid #cbd5e1; }
                        .item-icon { font-size: 16px; margin-right: 6px; }
                        .item-title { font-size: 15px; color: #0f172a; font-weight: 800; }
                        .item-category-tag { font-size: 10px; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px; margin-left: 8px; font-weight: 700; text-transform: uppercase; }
                        .item-summary-pills { display: flex; gap: 8px; }
                        .pill { font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 600; }
                        .pill-qty { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
                        .pill-count { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th { background: #0f172a; color: #ffffff; text-align: left; padding: 9px 10px; font-weight: 700; text-transform: uppercase; font-size: 11px; border: 1px solid #1e293b; }
                        td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        
                        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
                        .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
                        .badge-red { background: #ffe4e6; color: #be123c; border: 1px solid #fca5a5; }
                        .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
                        .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

                        .item-subtotal-row td { background: #f1f5f9; font-size: 12px; border-top: 2px solid #cbd5e1; }

                        /* Signatures & Department Seal Box */
                        .sign-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 35px; padding-top: 15px; page-break-inside: avoid; }
                        .sign-box { width: 200px; text-align: center; border-top: 2px dashed #64748b; padding-top: 8px; font-size: 12px; font-weight: 700; color: #334155; }
                        .stamp-box { border: 2px dashed #cbd5e1; width: 130px; height: 65px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; margin: 0 auto; text-align: center; }
                        
                        .footer-bar { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="no-print-bar no-print">
                        <div>
                            <strong style="font-size: 14px; color: #0f172a;">📄 Executive PDF Report Preview</strong>
                            <span style="font-size: 12px; color: #64748b; margin-left: 10px;">Click Print or Save as PDF below</span>
                        </div>
                        <div>
                            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
                            <button class="btn-close" onclick="window.close()">✖ Close Window</button>
                        </div>
                    </div>

                    <div class="header-banner">
                        <div>
                            <div class="org-logo">LibraryPro System</div>
                            <div class="report-heading">${reportTitle}</div>
                        </div>
                        <div class="report-meta">
                            <strong>Department:</strong> Stationary & Inventory Control<br>
                            <strong>Section:</strong> ${sectionName}<br>
                            <strong>Generated:</strong> ${new Date().toLocaleString()}
                        </div>
                    </div>

                    <div class="summary-grid">
                        <div class="stat-card">
                            <div class="stat-title">Total Records</div>
                            <div class="stat-val">${totalRecords} Entries</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Total Quantity Handled</div>
                            <div class="stat-val">${totalQty} Units</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Stationary Item Types</div>
                            <div class="stat-val">${uniqueStationaryCount} Distinct Items</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-title">Teachers / Recipients</div>
                            <div class="stat-val">${uniqueUsersCount} Users</div>
                        </div>
                    </div>

                    ${itemGroupsHtml}

                    <div class="sign-container">
                        <div class="sign-box">Store In-Charge / Admin</div>
                        <div>
                            <div class="stamp-box">Official Department<br>Seal / Stamp</div>
                        </div>
                        <div class="sign-box">HOD / Principal Verification</div>
                    </div>

                    <div class="footer-bar">
                        Confidential Official Document • Generated by LibraryPro Inventory Management System
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            try {
                printWindow.print();
            } catch (e) {
                console.error('PDF report print error:', e);
            }
        }, 300);
    };

    // ExportButtonsGroup is defined at module level above

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

    // filteredRequests — search by item name, user name, status
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchSearch = !requestSearch ||
                req.item_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
                req.user_name?.toLowerCase().includes(requestSearch.toLowerCase()) ||
                req.user_email?.toLowerCase().includes(requestSearch.toLowerCase()) ||
                req.reason?.toLowerCase().includes(requestSearch.toLowerCase()) ||
                String(req.id).includes(requestSearch);
            const matchStatus = requestStatusFilter === 'All' || req.status === requestStatusFilter;
            return matchSearch && matchStatus;
        });
    }, [requests, requestSearch, requestStatusFilter]);

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
                    {/* Add Item Form (Admin Only) */}
                    {isAdmin && (
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
                    )}

                    {/* Inventory Items List */}
                    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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

                                        {isAdmin && (
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
                                        )}
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Requisition & Issue Requests</h2>
                            <p className="text-xs text-slate-500">Manage and track teacher requisition requests.</p>
                        </div>
                        <ExportButtonsGroup
                            title="Teacher Requisition Requests"
                            dataList={requests}
                            sectionName="Requisitions"
                            exportDataToCSV={exportDataToCSV}
                            generatePDFReport={generatePDFReport}
                        />
                    </div>
                    {/* Search & Filter Bar */}
                    <div className="flex flex-wrap gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                            <RiSearchLine className="text-slate-400 flex-shrink-0" size={16} />
                            <input
                                type="text"
                                placeholder="Search by item, user, reason, ID..."
                                value={requestSearch}
                                onChange={e => setRequestSearch(e.target.value)}
                                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
                            />
                        </div>
                        <select
                            value={requestStatusFilter}
                            onChange={e => setRequestStatusFilter(e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="All">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Returned">Returned</option>
                        </select>
                        {(requestSearch || requestStatusFilter !== 'All') && (
                            <button
                                onClick={() => { setRequestSearch(''); setRequestStatusFilter('All'); }}
                                className="text-xs text-slate-500 hover:text-rose-600 px-2 py-1 rounded-lg border border-slate-200 bg-white transition"
                            >
                                Clear
                            </button>
                        )}
                        <span className="text-xs text-slate-400 self-center">{filteredRequests.length} of {requests.length} records</span>
                    </div>

                    {/* Bulk Actions */}
                    <div className="flex items-center gap-3 mb-4">
                        <label className="inline-flex items-center space-x-2">
                            <input type="checkbox" className="form-checkbox h-4 w-4" checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0} onChange={e => {
                                if (e.target.checked) setSelectedIds(filteredRequests.map(r => r.id));
                                else setSelectedIds([]);
                            }} />
                            <span className="text-sm font-medium text-slate-700">Select All</span>
                        </label>
                        <select
                            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            value={bulkStatus}
                            onChange={e => setBulkStatus(e.target.value)}
                        >
                            <option value="Approved">Approve</option>
                            <option value="Rejected">Reject</option>
                        </select>
                        <button
                            onClick={handleBulkAction}
                            disabled={selectedIds.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl disabled:opacity-40"
                        >
                            Apply to {selectedIds.length} request{selectedIds.length !== 1 && 's'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b">
                                    <th className="p-3"><input type="checkbox" className="form-checkbox h-4 w-4" checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0} onChange={e => {
                                        if (e.target.checked) setSelectedIds(filteredRequests.map(r => r.id));
                                        else setSelectedIds([]);
                                    }} /></th>
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
                                {filteredRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                                        <td className="p-3"><input type="checkbox" className="form-checkbox h-4 w-4" checked={selectedIds.includes(req.id)} onChange={e => {
                                            if (e.target.checked) setSelectedIds(prev => [...prev, req.id]);
                                            else setSelectedIds(prev => prev.filter(id => id !== req.id));
                                        }} /></td>
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
                                                <div className="text-xs text-indigo-700 font-semibold flex items-center justify-center gap-1 mt-1">
                                                    <span>📅</span> {new Date(req.acted_at).toLocaleDateString()}
                                                    <span>⏰</span> {new Date(req.acted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-amber-600 font-medium mt-1">Awaiting Action</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right space-x-1 flex items-center justify-end gap-1">
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
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => setEditingRequest(req)}
                                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition border border-indigo-200 flex items-center gap-1"
                                                        title="Edit Request"
                                                    >
                                                        <RiPencilLine size={15} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteRequest(req.id)}
                                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition border border-rose-200 flex items-center gap-1"
                                                        title="Delete Request"
                                                    >
                                                        <RiDeleteBinLine size={15} /> Delete
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handlePrintInvoice(req)}
                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition border border-slate-200"
                                                title="Print Invoice / Receipt"
                                            >
                                                <RiPrinterLine size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="p-8 text-center text-slate-400">
                                            {requests.length === 0 ? "You haven't submitted any stationary requests yet." : 'No requests match your filter.'}
                                        </td>
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
                            <ExportButtonsGroup
                                title="Stationary Issue & Dispatch Register"
                                dataList={filteredLedger.filter(row => row.transaction_type === 'ISSUED' || row.transaction_type === 'RETURNED')}
                                sectionName="Issue & Dispatch Logs"
                                exportDataToCSV={exportDataToCSV}
                                generatePDFReport={generatePDFReport}
                            />
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
                                            {isAdmin && (
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
                                            )}
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
                            <ExportButtonsGroup
                                title="Admin Purchase & Restock Register"
                                dataList={filteredLedger.filter(row => row.transaction_type === 'RECEIVED' || row.transaction_type === 'RESTOCK')}
                                sectionName="Purchase Register"
                                exportDataToCSV={exportDataToCSV}
                                generatePDFReport={generatePDFReport}
                            />
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
                                            {isAdmin && (
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
                                            )}
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

            {/* Edit Request Modal */}
            {editingRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
                        <h3 className="text-lg font-bold mb-4 text-slate-800">Edit Requisition Request #REQ-{editingRequest.id}</h3>
                        <form onSubmit={handleEditRequestSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teacher / User</label>
                                <input type="text" disabled className="w-full border rounded-xl p-2.5 text-sm bg-slate-100 font-semibold text-slate-700" value={`${editingRequest.user_name} (${editingRequest.user_email})`} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Item Requested</label>
                                <input type="text" disabled className="w-full border rounded-xl p-2.5 text-sm bg-slate-100 font-semibold text-indigo-700" value={editingRequest.item_name} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Quantity</label>
                                    <input type="number" min="1" className="w-full border rounded-xl p-2.5 text-sm font-bold text-slate-800" value={editingRequest.quantity} onChange={e => setEditingRequest({ ...editingRequest, quantity: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unit</label>
                                    <input type="text" className="w-full border rounded-xl p-2.5 text-sm" value={editingRequest.unit || 'pcs'} onChange={e => setEditingRequest({ ...editingRequest, unit: e.target.value })} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status</label>
                                <select className="w-full border rounded-xl p-2.5 text-sm font-semibold text-slate-700 bg-slate-50" value={editingRequest.status} onChange={e => setEditingRequest({ ...editingRequest, status: e.target.value })}>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Returned">Returned</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Reason / Purpose</label>
                                <textarea rows="3" className="w-full border rounded-xl p-2.5 text-sm" value={editingRequest.reason || ''} onChange={e => setEditingRequest({ ...editingRequest, reason: e.target.value })} placeholder="Reason for requisition..."></textarea>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setEditingRequest(null)} className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-bold shadow-md shadow-indigo-600/20">Save Changes</button>
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

    const exportDataToCSV = (title, dataList, sectionName = 'General') => {
        if (!dataList || !dataList.length) return toast.error(`No ${title.toLowerCase()} records to export`);
        let totalQty = 0;
        const formattedRows = dataList.map((row, idx) => {
            const qty = Number(row.received_qty || row.issued_qty || row.quantity || 0);
            totalQty += qty;
            const reqDateStr = row.requested_at || row.date;
            const reqDateTime = reqDateStr ? new Date(reqDateStr).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A';
            const issueDateStr = row.acted_at || (['Approved', 'Returned', 'ISSUED'].includes(row.status || row.transaction_type) ? row.date : null);
            const issueDateTime = issueDateStr ? new Date(issueDateStr).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : (row.status === 'Pending' ? 'Awaiting Action' : 'N/A');
            return {
                "Sr. No.": `#${idx + 1}`,
                "Voucher / Ref No.": row.id ? `#REQ-${row.id}` : (row.reference_no || row.bill_number || 'N/A'),
                "Stationary Item Name": row.item_name || 'N/A',
                "Category": row.category || 'N/A',
                "Requisition Date & Time": reqDateTime,
                "Issue / Action Date & Time": issueDateTime,
                "Quantity": qty,
                "Unit": row.unit || 'pcs',
                "Stock Balance": row.balance !== undefined ? `${row.balance} ${row.unit || 'pcs'}` : 'N/A',
                "Teacher / Recipient": row.user_name || 'Admin',
                "Email & Role": row.user_email ? `${row.user_email} (${row.user_role || 'User'})` : (row.user_role || 'Staff/Admin'),
                "Status / Action": row.status || row.transaction_type || 'N/A',
                "Reason / Notes": row.reason || row.notes || 'N/A'
            };
        });
        let csvString = "\uFEFF";
        csvString += `"=========================================================================================="\r\n`;
        csvString += `"LIBRARYPRO - OFFICIAL MANAGEMENT REPORT"\r\n`;
        csvString += `"Report Title:","${title.toUpperCase().replace(/"/g, '""')}"\r\n`;
        csvString += `"Section / Department:","${sectionName.replace(/"/g, '""')}"\r\n`;
        csvString += `"Generated Date & Time:","${new Date().toLocaleString()}"\r\n`;
        csvString += `"Total Records:","${dataList.length}"\r\n`;
        csvString += `"=========================================================================================="\r\n\r\n`;
        const keys = Object.keys(formattedRows[0]);
        csvString += keys.map(k => `"${k.replace(/"/g, '""')}"`).join(",") + "\r\n";
        formattedRows.forEach(row => {
            const values = keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`);
            csvString += values.join(",") + "\r\n";
        });
        csvString += `\r\n"=========================================================================================="\r\n`;
        csvString += `"SUMMARY TOTALS"\r\n`;
        csvString += `"Total Records Exported:","${dataList.length}"\r\n`;
        csvString += `"Total Quantity Sum:","${totalQty}"\r\n`;
        csvString += `"Document Status:","Official Confidential Export"\r\n`;
        csvString += `"=========================================================================================="\r\n`;
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`${title} exported to CSV!`);
    };

    const generatePDFReport = (reportTitle, dataList, sectionName = 'General') => {
        if (!dataList || !dataList.length) return toast.error(`No data to generate ${reportTitle}`);
        let totalQty = 0;
        let totalRecords = dataList.length;
        const itemGroups = dataList.reduce((acc, row) => {
            const itemName = row.item_name || 'General Stationary';
            if (!acc[itemName]) { acc[itemName] = { category: row.category || 'N/A', unit: row.unit || 'pcs', items: [], totalQty: 0 }; }
            const qty = Number(row.received_qty || row.issued_qty || row.quantity || 0);
            acc[itemName].items.push(row);
            acc[itemName].totalQty += qty;
            totalQty += qty;
            return acc;
        }, {});
        const uniqueStationaryCount = Object.keys(itemGroups).length;
        const uniqueUsersCount = new Set(dataList.map(r => r.user_name || r.user_email).filter(Boolean)).size;
        const itemGroupsHtml = Object.entries(itemGroups).map(([itemName, group]) => {
            const tableRows = group.items.map((row, idx) => {
                const qty = row.received_qty || row.issued_qty || row.quantity || 0;
                const status = row.status || row.transaction_type || 'N/A';
                let badgeClass = 'badge-amber';
                if (['RECEIVED', 'RESTOCK', 'Approved'].includes(status)) badgeClass = 'badge-green';
                if (['ISSUED', 'Rejected'].includes(status)) badgeClass = 'badge-red';
                if (['Returned'].includes(status)) badgeClass = 'badge-blue';
                const reqDateStr = row.requested_at || row.date;
                const reqDateHtml = reqDateStr ? `<div style="font-weight:600;color:#1e293b;">📅 ${new Date(reqDateStr).toLocaleDateString()}</div><div style="font-size:10px;color:#64748b;">⏰ ${new Date(reqDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : 'N/A';
                const issueDateStr = row.acted_at || (['Approved', 'Returned', 'ISSUED'].includes(status) ? row.date : null);
                const issueDateHtml = issueDateStr ? `<div style="font-weight:600;color:#15803d;">📅 ${new Date(issueDateStr).toLocaleDateString()}</div><div style="font-size:10px;color:#15803d;">⏰ ${new Date(issueDateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : (status === 'Pending' ? '<span style="font-size:11px;color:#b45309;font-weight:600;">⏳ Awaiting Action</span>' : '<span style="color:#94a3b8;">-</span>');
                const refNo = row.id ? `#REQ-${row.id}` : (row.reference_no || row.bill_number || 'N/A');
                return `<tr><td style="text-align:center;font-weight:bold;color:#475569;">#${idx + 1}</td><td><span style="font-family:monospace;font-weight:bold;background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:11px;">${refNo}</span></td><td>${reqDateHtml}</td><td>${issueDateHtml}</td><td><strong>${row.user_name || 'Admin'}</strong>${row.user_email ? `<br><small style="color:#64748b;">${row.user_email} (${row.user_role || 'User'})</small>` : ''}</td><td style="text-align:right;font-weight:800;color:#4338ca;">${qty} ${group.unit}</td><td style="text-align:right;font-weight:700;color:#0f766e;">${row.balance !== undefined ? row.balance + ' ' + group.unit : '-'}</td><td style="text-align:center;"><span class="badge ${badgeClass}">${status}</span></td><td style="font-size:11px;color:#334155;">${row.reason || row.notes || '-'}</td></tr>`;
            }).join('');
            return `<div class="item-group-box"><div class="item-group-header"><div><span class="item-icon">📦</span><strong class="item-title">${itemName}</strong><span class="item-category-tag">${group.category}</span></div><div class="item-summary-pills"><span class="pill pill-qty">Total Qty: <strong>${group.totalQty} ${group.unit}</strong></span><span class="pill pill-count">Requests: <strong>${group.items.length}</strong></span></div></div><table><thead><tr><th style="width:35px;text-align:center;">Sr.</th><th style="width:90px;">Req / Ref No.</th><th style="width:110px;">Requisition Date & Time</th><th style="width:110px;">Issue Date & Time</th><th>Teacher / Recipient</th><th style="width:80px;text-align:right;">Quantity</th><th style="width:75px;text-align:right;">Stock Bal</th><th style="width:75px;text-align:center;">Status</th><th>Reason / Notes</th></tr></thead><tbody>${tableRows}<tr class="item-subtotal-row"><td colspan="5" style="text-align:right;font-weight:bold;color:#1e1b4b;">Subtotal for ${itemName}:</td><td style="text-align:right;font-weight:900;color:#4338ca;">${group.totalQty} ${group.unit}</td><td colspan="3"></td></tr></tbody></table></div>`;
        }).join('');
        const printWindow = window.open('', '_blank');
        if (!printWindow) return toast.error('Popup blocked! Please allow popups for this site.');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${reportTitle} - LibraryPro Report</title><style>@page{size:A4 portrait;margin:10mm;}@media print{.no-print{display:none!important;}body{padding:0;background:#fff;}.item-group-box{page-break-inside:avoid;}}body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:15px;color:#0f172a;background:#fff;}.no-print-bar{display:flex;justify-content:space-between;align-items:center;background:#f1f5f9;padding:12px 20px;border-radius:10px;margin-bottom:20px;border:1px solid #cbd5e1;}.btn-print{background:#4f46e5;color:white;border:none;padding:8px 18px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:13px;}.btn-close{background:#cbd5e1;color:#334155;border:none;padding:8px 18px;border-radius:8px;font-weight:bold;cursor:pointer;margin-left:8px;font-size:13px;}.header-banner{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:20px;}.org-logo{font-size:24px;font-weight:900;color:#4338ca;}.report-heading{font-size:18px;font-weight:800;color:#0f172a;margin-top:4px;}.report-meta{text-align:right;font-size:12px;color:#475569;line-height:1.5;}.summary-grid{display:flex;gap:12px;margin-bottom:22px;}.stat-card{flex:1;border:2px solid #cbd5e1;border-radius:10px;padding:10px 14px;background:#f8fafc;box-shadow:0 4px 8px rgba(0,0,0,0.04);}.stat-title{font-size:10px;text-transform:uppercase;font-weight:700;color:#64748b;letter-spacing:0.5px;}.stat-val{font-size:18px;font-weight:900;color:#1e1b4b;margin-top:2px;}.item-group-box{border:2px solid #cbd5e1;border-radius:12px;overflow:hidden;margin-bottom:22px;box-shadow:0 4px 10px rgba(0,0,0,0.04);background:#ffffff;}.item-group-header{display:flex;justify-content:space-between;align-items:center;background:#f1f5f9;padding:10px 16px;border-bottom:2px solid #cbd5e1;}.item-icon{font-size:16px;margin-right:6px;}.item-title{font-size:15px;color:#0f172a;font-weight:800;}.item-category-tag{font-size:10px;background:#e2e8f0;color:#475569;padding:2px 8px;border-radius:12px;margin-left:8px;font-weight:700;text-transform:uppercase;}.item-summary-pills{display:flex;gap:8px;}.pill{font-size:11px;padding:4px 10px;border-radius:6px;font-weight:600;}.pill-qty{background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;}.pill-count{background:#fef3c7;color:#92400e;border:1px solid #fde68a;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#0f172a;color:#ffffff;text-align:left;padding:9px 10px;font-weight:700;text-transform:uppercase;font-size:11px;border:1px solid #1e293b;}td{padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;}tr:nth-child(even){background-color:#f8fafc;}.badge{display:inline-block;padding:3px 8px;border-radius:6px;font-weight:700;font-size:10px;text-transform:uppercase;}.badge-green{background:#dcfce7;color:#15803d;border:1px solid #86efac;}.badge-red{background:#ffe4e6;color:#be123c;border:1px solid #fca5a5;}.badge-amber{background:#fef3c7;color:#b45309;border:1px solid #fde68a;}.badge-blue{background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;}.item-subtotal-row td{background:#f1f5f9;font-size:12px;border-top:2px solid #cbd5e1;}.sign-container{display:flex;justify-content:space-between;align-items:flex-end;margin-top:35px;padding-top:15px;page-break-inside:avoid;}.sign-box{width:200px;text-align:center;border-top:2px dashed #64748b;padding-top:8px;font-size:12px;font-weight:700;color:#334155;}.stamp-box{border:2px dashed #cbd5e1;width:130px;height:65px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;margin:0 auto;text-align:center;}.footer-bar{text-align:center;font-size:11px;color:#94a3b8;margin-top:25px;border-top:1px solid #e2e8f0;padding-top:10px;}</style></head><body><div class="no-print-bar no-print"><div><strong style="font-size:14px;color:#0f172a;">📄 Executive PDF Report Preview</strong><span style="font-size:12px;color:#64748b;margin-left:10px;">Click Print or Save as PDF below</span></div><div><button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button><button class="btn-close" onclick="window.close()">✖ Close Window</button></div></div><div class="header-banner"><div><div class="org-logo">LibraryPro System</div><div class="report-heading">${reportTitle}</div></div><div class="report-meta"><strong>Department:</strong> Stationary &amp; Inventory Control<br><strong>Section:</strong> ${sectionName}<br><strong>Generated:</strong> ${new Date().toLocaleString()}</div></div><div class="summary-grid"><div class="stat-card"><div class="stat-title">Total Records</div><div class="stat-val">${totalRecords} Entries</div></div><div class="stat-card"><div class="stat-title">Total Quantity Handled</div><div class="stat-val">${totalQty} Units</div></div><div class="stat-card"><div class="stat-title">Stationary Item Types</div><div class="stat-val">${uniqueStationaryCount} Distinct Items</div></div><div class="stat-card"><div class="stat-title">Teachers / Recipients</div><div class="stat-val">${uniqueUsersCount} Users</div></div></div>${itemGroupsHtml}<div class="sign-container"><div class="sign-box">Store In-Charge / Admin</div><div><div class="stamp-box">Official Department<br>Seal / Stamp</div></div><div class="sign-box">HOD / Principal Verification</div></div><div class="footer-bar">Confidential Official Document • Generated by LibraryPro Inventory Management System</div></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { try { printWindow.print(); } catch (e) { console.error('PDF report print error:', e); } }, 300);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stationary/reports');
            if (res.data) {
                setReportsData({
                    reports: Array.isArray(res.data.reports) ? res.data.reports : [],
                    topItems: Array.isArray(res.data.topItems) ? res.data.topItems : [],
                    categoryBreakdown: Array.isArray(res.data.categoryBreakdown) ? res.data.categoryBreakdown : []
                });
            }
        } catch (error) {
            console.error('Error fetching stationary reports:', error);
            toast.error('Failed to load consumption analytics');
        }

        try {
            const reqRes = await api.get('/stationary/requests');
            setAllRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        } catch (error) {
            console.error('Error fetching stationary requests:', error);
        } finally {
            setLoading(false);
        }
    };

    // User-wise Top Consumption Graph Data
    const ITEM_COLORS = [
        '#6366f1','#f59e0b','#10b981','#ec4899','#14b8a6','#ef4444',
        '#8b5cf6','#f97316','#0ea5e9','#84cc16','#e11d48','#06b6d4'
    ];

    const itemColorMap = useMemo(() => {
        if (!reportsData.reports) return {};
        const uniqueItems = [...new Set(
            reportsData.reports.map(r => r.top_item).filter(Boolean)
        )];
        const map = {};
        uniqueItems.forEach((item, idx) => {
            map[item] = ITEM_COLORS[idx % ITEM_COLORS.length];
        });
        return map;
    }, [reportsData]);

    const topUserConsumptionChart = useMemo(() => {
        if (!reportsData.reports || !reportsData.reports.length) return [];
        return reportsData.reports
            .map(r => ({
                name: r.user_name,
                total: Number(r.total_items_consumed || 0),
                topItem: r.top_item || 'Unknown',
                color: itemColorMap[r.top_item] || '#94a3b8'
            }))
            .filter(r => r.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [reportsData, itemColorMap]);

    // Users grouped by their top item
    const groupedByTopItem = useMemo(() => {
        if (!reportsData.reports) return {};
        const groups = {};
        reportsData.reports
            .filter(r => Number(r.total_items_consumed || 0) > 0)
            .forEach(r => {
                const key = r.top_item || 'Other';
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
            });
        // sort each group by consumption desc
        Object.keys(groups).forEach(k => {
            groups[k].sort((a, b) => b.total_items_consumed - a.total_items_consumed);
        });
        return groups;
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">User Consumption Report: {userDetails.user.name}</h2>
                        <p className="text-xs text-slate-500">{userDetails.user.email} • Role: {userDetails.user.role}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <ExportButtonsGroup
                            title={`Consumption Report - ${userDetails.user.name}`}
                            dataList={userDetails.details}
                            sectionName="Teacher Analytics"
                            exportDataToCSV={exportDataToCSV}
                            generatePDFReport={generatePDFReport}
                        />
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 whitespace-nowrap"
                        >
                            ← Back to All Reports
                        </button>
                    </div>
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
                {/* Graph 1: Top Consuming Users — bars colored by top_item */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-md font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <RiUserSmileLine className="text-fuchsia-600" />
                        Top Users by Consumption
                    </h2>
                    <p className="text-xs text-slate-400 mb-3">Bar color represents each user's most-used item</p>
                    <div className="h-64 w-full">
                        {topUserConsumptionChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topUserConsumptionChart} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
                                                        <p className="font-bold text-slate-800 mb-1">{d.name}</p>
                                                        <p className="text-slate-500">Total Consumed: <span className="font-bold text-slate-800">{d.total}</span></p>
                                                        <p className="mt-1">Top Item: <span className="font-bold" style={{ color: d.color }}>{d.topItem}</span></p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Total Items Consumed">
                                        {topUserConsumptionChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                No user consumption data available yet.
                            </div>
                        )}
                    </div>
                    {/* Color Legend */}
                    {Object.keys(itemColorMap).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(itemColorMap).map(([item, color]) => (
                                <span key={item} className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
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
                                <th className="p-3">Top Item Used</th>
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
                                    <td className="p-3">
                                        {report.top_item ? (
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                                                style={{ backgroundColor: itemColorMap[report.top_item] || '#94a3b8' }}
                                            >
                                                <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                                                {report.top_item}
                                            </span>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
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

            {/* Users Grouped by Top Item */}
            {Object.keys(groupedByTopItem).length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Users Grouped by Most-Used Item</h2>
                    <p className="text-xs text-slate-400 mb-5">Each group shows users whose most-consumed item is the same</p>
                    <div className="space-y-5">
                        {Object.entries(groupedByTopItem)
                            .sort((a, b) => b[1].length - a[1].length)
                            .map(([item, users]) => {
                                const color = itemColorMap[item] || '#94a3b8';
                                return (
                                    <div key={item}>
                                        {/* Item Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <span
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold text-white shadow-sm"
                                                style={{ backgroundColor: color }}
                                            >
                                                <span className="w-2 h-2 bg-white/50 rounded-full" />
                                                {item}
                                            </span>
                                            <span className="text-xs text-slate-400">{users.length} user{users.length > 1 ? 's' : ''}</span>
                                            <div className="flex-1 h-px bg-slate-100" />
                                        </div>
                                        {/* Users under this item */}
                                        <div className="flex flex-wrap gap-3">
                                            {users.map(u => (
                                                <div
                                                    key={u.user_id}
                                                    className="flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-2.5 cursor-pointer hover:shadow-md transition"
                                                    style={{ borderColor: color + '44' }}
                                                    onClick={() => fetchTeacherDetails(u.user_id)}
                                                    title="Click to view details"
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {u.user_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">{u.user_name}</p>
                                                        <p className="text-xs text-slate-400">{u.total_items_consumed} items consumed</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default StationaryAdmin;
