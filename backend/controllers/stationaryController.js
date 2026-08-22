const db = require('../config/db');
const { notifyAdmins } = require('./notificationController');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

// --- ITEM MANAGEMENT (Admin / HOD) ---

// Get all items
exports.getAllItems = async (req, res) => {
    try {
        const [items] = await db.query('SELECT * FROM stationary_items ORDER BY item_name ASC');
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

// Helper to combine existing and new bill/invoice numbers (comma separated, deduplicated)
const combineBillNumbers = (existingBills, newBill) => {
    if (!newBill || typeof newBill !== 'string' || !newBill.trim()) {
        return existingBills || null;
    }
    if (!existingBills || typeof existingBills !== 'string' || !existingBills.trim()) {
        return newBill.trim();
    }

    const existingList = existingBills
        .split(',')
        .map(b => b.trim())
        .filter(Boolean);

    const newBillsList = newBill
        .split(',')
        .map(b => b.trim())
        .filter(Boolean);

    for (const bill of newBillsList) {
        if (!existingList.some(b => b.toLowerCase() === bill.toLowerCase())) {
            existingList.push(bill);
        }
    }

    return existingList.join(', ');
};

// Add new item (with Smart Stock Merge & Bill Number Accumulation)
exports.addItem = async (req, res) => {
    const { item_name, category, total_stock, min_stock_limit, unit, bill_number } = req.body;
    const user_id = req.user?.id || null;

    if (!item_name || total_stock === undefined) {
        return res.status(400).json({ message: 'Item name and total stock are required' });
    }

    try {
        const stockQty = Number(total_stock) || 0;
        const cleanName = item_name.trim();

        // Check if an item with the same name already exists (case insensitive)
        const [existing] = await db.query(
            'SELECT * FROM stationary_items WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(?))',
            [cleanName]
        );

        if (existing.length > 0) {
            const item = existing[0];
            const newTotal = Number(item.total_stock) + stockQty;
            const newAvailable = Number(item.available_stock) + stockQty;
            const cleanBill = bill_number && bill_number.trim() !== '' ? bill_number.trim() : null;
            const newBill = combineBillNumbers(item.bill_number, cleanBill);

            // Update existing item's stock, bill_number, and details
            await db.query(
                `UPDATE stationary_items 
                 SET total_stock = ?, 
                     available_stock = ?, 
                     bill_number = ?, 
                     category = COALESCE(?, category), 
                     min_stock_limit = COALESCE(?, min_stock_limit), 
                     unit = COALESCE(?, unit)
                 WHERE id = ?`,
                [
                    newTotal, 
                    newAvailable, 
                    newBill, 
                    category || null, 
                    min_stock_limit || null, 
                    unit || null, 
                    item.id
                ]
            );

            // Record entry in stationary_ledger
            await db.query(
                `INSERT INTO stationary_ledger 
                (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                VALUES (?, 'RECEIVED', ?, 0, ?, ?, ?, ?, ?)`,
                [
                    item.id, 
                    stockQty, 
                    item.available_stock, 
                    newAvailable, 
                    cleanBill || (item.bill_number ? item.bill_number.split(',')[0].trim() : 'RESTOCK'), 
                    user_id, 
                    `Stock merged (+${stockQty} ${unit || item.unit}). Bill: ${cleanBill || 'N/A'} (All Bills: ${newBill || 'N/A'})`
                ]
            );

            return res.status(200).json({
                message: `Existing item "${item.item_name}" found! Stock increased by +${stockQty} (Total Available: ${newAvailable} ${unit || item.unit}). Bill numbers: ${newBill || 'N/A'}`,
                itemId: item.id,
                merged: true
            });
        }

        // Otherwise, insert new item
        const [result] = await db.query(
            'INSERT INTO stationary_items (item_name, category, total_stock, available_stock, min_stock_limit, unit, bill_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [cleanName, category || 'Consumable', stockQty, stockQty, min_stock_limit || 5, unit || 'pcs', bill_number ? bill_number.trim() : null]
        );

        const itemId = result.insertId;

        // Log entry into ledger
        await db.query(
            `INSERT INTO stationary_ledger 
            (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
            VALUES (?, 'RECEIVED', ?, 0, 0, ?, ?, ?, 'New Item Created & Initial Stock Added')`,
            [itemId, stockQty, stockQty, (bill_number && bill_number.trim()) || 'INITIAL', user_id]
        );

        res.status(201).json({ message: `Stationary item "${cleanName}" added successfully`, itemId, merged: false });
    } catch (error) {
        console.error('ADD ITEM ERROR:', error);
        res.status(500).json({ message: 'Error adding item', error: error.message });
    }
};

// Update item (e.g., adding stock)
exports.updateItem = async (req, res) => {
    const { id } = req.params;
    const { item_name, category, min_stock_limit, unit, add_stock, total_stock, available_stock, bill_number } = req.body;
    const user_id = req.user?.id || null;

    try {
        // Get current item state
        const [existingArr] = await db.query('SELECT * FROM stationary_items WHERE id = ?', [id]);
        if (existingArr.length === 0) return res.status(404).json({ message: 'Item not found' });

        const existing = existingArr[0];

        let currentTotal = existing.total_stock;
        let currentAvailable = existing.available_stock;

        if (total_stock !== undefined && !isNaN(total_stock)) {
            currentTotal = parseInt(total_stock);
        }
        if (available_stock !== undefined && !isNaN(available_stock)) {
            currentAvailable = parseInt(available_stock);
        }

        const updateName = item_name !== undefined ? item_name : existing.item_name;
        const updateCategory = category !== undefined ? category : existing.category;
        const updateMinLimit = min_stock_limit !== undefined ? min_stock_limit : existing.min_stock_limit;
        const updateUnit = unit !== undefined ? unit : existing.unit;

        const extraStock = (add_stock !== undefined && !isNaN(add_stock)) ? parseInt(add_stock) : 0;

        let updateBillNumber;
        if (extraStock > 0) {
            // When adding stock, combine/accumulate new bill number with old bill number(s)
            updateBillNumber = (bill_number && bill_number.trim() !== '') 
                ? combineBillNumbers(existing.bill_number, bill_number.trim()) 
                : existing.bill_number;
            currentTotal += extraStock;
            currentAvailable += extraStock;
        } else {
            // In direct item edit modal, use the exact bill_number provided
            updateBillNumber = bill_number !== undefined ? bill_number : existing.bill_number;
        }

        let queryParams = [updateName, updateCategory, updateMinLimit, updateUnit, updateBillNumber, currentTotal, currentAvailable, id];
        let queryStr = 'UPDATE stationary_items SET item_name = ?, category = ?, min_stock_limit = ?, unit = ?, bill_number = ?, total_stock = ?, available_stock = ? WHERE id = ?';

        await db.query(queryStr, queryParams);

        // Record stock ledger entry if stock was added or adjusted
        if (extraStock > 0) {
            const prevBalance = existing.available_stock;
            const newBalance = currentAvailable;
            const refNo = (bill_number && bill_number.trim()) 
                ? bill_number.trim() 
                : (existing.bill_number ? existing.bill_number.split(',')[0].trim() : `RESTOCK-#${id}`);

            await db.query(
                `INSERT INTO stationary_ledger 
                (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                VALUES (?, 'RECEIVED', ?, 0, ?, ?, ?, ?, ?)`,
                [id, extraStock, prevBalance, newBalance, refNo, user_id, `Stock Added / Restocked (+${extraStock} ${updateUnit})${bill_number && bill_number.trim() ? ` [New Bill: ${bill_number.trim()}]` : ''}`]
            );
        } else if (available_stock !== undefined && parseInt(available_stock) !== existing.available_stock) {
            const diff = parseInt(available_stock) - existing.available_stock;
            const transType = diff > 0 ? 'RECEIVED' : 'ISSUED';
            const recQty = diff > 0 ? diff : 0;
            const issQty = diff < 0 ? Math.abs(diff) : 0;

            await db.query(
                `INSERT INTO stationary_ledger 
                (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Stock Quantity Manually Adjusted by Admin')`,
                [id, transType, recQty, issQty, existing.available_stock, parseInt(available_stock), updateBillNumber || existing.bill_number || `ADJUST-#${id}`, user_id]
            );
        }

        res.json({ message: 'Item updated successfully', bill_number: updateBillNumber });
    } catch (error) {
        console.error('UPDATE ITEM ERROR:', error);
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

// Delete item
exports.deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM stationary_items WHERE id = ?', [id]);
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};

// --- REQUEST MANAGEMENT ---

// Request an item (Teacher / Student / Staff)
exports.requestItem = async (req, res) => {
    const { item_id, quantity, reason, unit } = req.body;
    const user_id = req.user.id;

    if (!item_id || !quantity) {
        return res.status(400).json({ message: 'Item and quantity are required' });
    }

    try {
        // Block students from requesting stationary
        if (req.user.role === 'student') {
            return res.status(403).json({ message: 'Stationary requisition is only available for Teachers and Staff. Students are not eligible for stationary requests.' });
        }

        // Check if user is blocked
        const [userDb] = await db.query('SELECT stationary_blocked FROM users WHERE id = ?', [user_id]);
        if (userDb[0] && userDb[0].stationary_blocked) {
            return res.status(403).json({ message: 'Your stationary access has been blocked by the admin. Please return pending items or contact administration.' });
        }

        // Check if available stock is enough
        const [item] = await db.query('SELECT available_stock, unit FROM stationary_items WHERE id = ?', [item_id]);
        if (item.length === 0) return res.status(404).json({ message: 'Item not found' });

        if (item[0].available_stock < quantity) {
            return res.status(400).json({ message: 'Not enough stock available for this request' });
        }

        const selectedUnit = unit || item[0]?.unit || 'pcs';

        await db.query(
            'INSERT INTO stationary_requests (user_id, item_id, quantity, unit, reason) VALUES (?, ?, ?, ?, ?)',
            [user_id, item_id, quantity, selectedUnit, reason]
        );

        // Notify Admins and HODs about new Stationary Request
        try {
            const [userRow] = await db.query('SELECT name FROM users WHERE id = ?', [user_id]);
            const [itemRow] = await db.query('SELECT item_name FROM stationary_items WHERE id = ?', [item_id]);
            const requesterName = userRow[0]?.name || 'Teacher';
            const itemName = itemRow[0]?.item_name || 'stationary item';
            
            const notificationMsg = `📝 New Stationary Request: ${requesterName} requested ${quantity} ${selectedUnit} of "${itemName}".`;
            await notifyAdmins(notificationMsg, 'warning');

            // Send WhatsApp Notification
            const whatsappMsg = `📦 New Stationary Requisition Request!
Teacher/Staff: ${requesterName}
Item: ${itemName}
Quantity: ${quantity} ${selectedUnit}
Reason: ${reason || 'N/A'}
Date: ${new Date().toLocaleString()}`;

            await sendWhatsAppMessage(whatsappMsg);
        } catch (notifErr) {
            console.error('Notification error on stationary request:', notifErr);
        }

        res.status(201).json({ message: 'Request submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting request', error: error.message });
    }
};

// Get requests (Admin/HOD: all, Teacher/Student: own)
exports.getRequests = async (req, res) => {
    try {
        let query = `
            SELECT r.*, COALESCE(r.unit, i.unit, 'pcs') as unit,
                   i.item_name, i.category,
                   u.name as user_name, u.email as user_email, u.role as user_role
            FROM stationary_requests r
            JOIN stationary_items i ON r.item_id = i.id
            JOIN users u ON r.user_id = u.id
        `;
        let params = [];

        if ((req.user.role !== 'admin' && req.user.role !== 'hod') || req.query.view === 'personal') {
            query += ' WHERE r.user_id = ?';
            params.push(req.user.id);
        }

        query += ' ORDER BY r.requested_at DESC';

        const [requests] = await db.query(query, params);
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
};

// Update request status & details (Admin/HOD) with Automatic Stock Rebalancing
exports.updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status, quantity, reason, unit } = req.body;

    try {
        const [requestData] = await db.query('SELECT * FROM stationary_requests WHERE id = ?', [id]);
        if (requestData.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = requestData[0];
        const prevStatus = request.status;
        const prevQty = Number(request.quantity);
        const itemId = request.item_id;

        const targetStatus = status || prevStatus;
        const targetQuantity = quantity !== undefined ? Number(quantity) : prevQty;
        const targetReason = reason !== undefined ? reason : request.reason;
        const targetUnit = unit !== undefined ? unit : request.unit;

        // Fetch item stock
        const [itemData] = await db.query('SELECT available_stock, total_stock FROM stationary_items WHERE id = ?', [itemId]);
        if (itemData.length === 0) return res.status(404).json({ message: 'Item not found' });

        let currentAvailable = itemData[0].available_stock;

        // Step A: Revert old status effect
        if (prevStatus === 'Approved') {
            currentAvailable += prevQty;
        }

        // Step B: Apply new status effect
        if (targetStatus === 'Approved') {
            if (currentAvailable < targetQuantity) {
                return res.status(400).json({ message: `Not enough available stock (${currentAvailable}) to approve this request.` });
            }
            currentAvailable -= targetQuantity;
        }

        // Step C: Update item available_stock in DB if changed
        if (currentAvailable !== itemData[0].available_stock) {
            await db.query('UPDATE stationary_items SET available_stock = ? WHERE id = ?', [currentAvailable, itemId]);

            const diff = currentAvailable - itemData[0].available_stock;
            const transType = diff < 0 ? 'ISSUED' : 'RETURNED';
            const issQty = diff < 0 ? Math.abs(diff) : 0;
            const recQty = diff > 0 ? diff : 0;

            await db.query(
                `INSERT INTO stationary_ledger 
                (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [itemId, transType, recQty, issQty, itemData[0].available_stock, currentAvailable, `REQ-#${request.id}`, request.user_id, `Request Status/Qty Updated to ${targetStatus} (${targetQuantity} ${targetUnit})`]
            );
        }

        // Update status, quantity, reason, unit in stationary_requests table
        const hasStatusChanged = prevStatus !== targetStatus;
        await db.query(
            `UPDATE stationary_requests 
             SET status = ?, quantity = ?, reason = ?, unit = ? ${hasStatusChanged ? ', acted_at = NOW()' : ''} 
             WHERE id = ?`,
            [targetStatus, targetQuantity, targetReason, targetUnit, id]
        );

        // Feature: Low Stock Alert — notify admins if stock fell below min_stock_limit after approval
        if (targetStatus === 'Approved') {
            try {
                const [updatedItem] = await db.query(
                    'SELECT item_name, available_stock, min_stock_limit, unit FROM stationary_items WHERE id = ?',
                    [itemId]
                );
                if (updatedItem.length > 0) {
                    const it = updatedItem[0];
                    if (Number(it.available_stock) < Number(it.min_stock_limit)) {
                        await notifyAdmins(
                            `⚠️ Low Stock Alert: "${it.item_name}" is running low! Only ${it.available_stock} ${it.unit} remaining (Minimum: ${it.min_stock_limit} ${it.unit}). Please restock soon.`,
                            'alert'
                        );
                    }
                }
            } catch (alertErr) {
                console.error('Low stock alert error:', alertErr);
            }
        }

        res.json({ message: 'Request updated successfully and stock inventory rebalanced' });
    } catch (error) {
        console.error('UPDATE REQUEST ERROR:', error);
        res.status(500).json({ message: 'Error updating request', error: error.message });
    }
};

// Delete request (Admin/HOD) with Automatic Stock Rebalancing
exports.deleteRequest = async (req, res) => {
    const { id } = req.params;
    try {
        const [requestData] = await db.query('SELECT * FROM stationary_requests WHERE id = ?', [id]);
        if (requestData.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = requestData[0];

        // If request was Approved, restore deducted stock back to inventory
        if (request.status === 'Approved') {
            const [itemData] = await db.query('SELECT available_stock FROM stationary_items WHERE id = ?', [request.item_id]);
            if (itemData.length > 0) {
                const currentStock = itemData[0].available_stock;
                const restoredStock = currentStock + Number(request.quantity);

                await db.query('UPDATE stationary_items SET available_stock = ? WHERE id = ?', [restoredStock, request.item_id]);

                // Log in ledger
                await db.query(
                    `INSERT INTO stationary_ledger 
                    (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                    VALUES (?, 'RETURNED', ?, 0, ?, ?, ?, ?, 'Stock Restored: Approved Request Deleted')`,
                    [request.item_id, request.quantity, currentStock, restoredStock, `REQ-#${request.id}`, request.user_id]
                );
            }
        }

        await db.query('DELETE FROM stationary_requests WHERE id = ?', [id]);
        res.json({ message: 'Request deleted and stock inventory rebalanced successfully' });
    } catch (error) {
        console.error('DELETE REQUEST ERROR:', error);
        res.status(500).json({ message: 'Error deleting request', error: error.message });
    }
};

// --- STOCK REGISTER / LEDGER ---

// Get Stock Register Ledger Log (Admin/HOD)
exports.getLedger = async (req, res) => {
    try {
        const query = `
            SELECT 
                l.id,
                l.created_at,
                l.transaction_type,
                l.received_qty,
                l.issued_qty,
                l.previous_balance,
                l.new_balance,
                l.reference_no,
                l.notes,
                i.item_name,
                i.category,
                i.unit,
                u.name as user_name,
                u.role as user_role
            FROM stationary_ledger l
            JOIN stationary_items i ON l.item_id = i.id
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC, l.id DESC
        `;
        const [rows] = await db.query(query);

        // Format rows with 1-indexed serial numbers (Sr. No.)
        const formatted = rows.map((row, idx) => ({
            sr_no: idx + 1,
            id: row.id,
            date: row.created_at,
            item_name: row.item_name,
            category: row.category,
            unit: row.unit,
            transaction_type: row.transaction_type,
            received_qty: row.received_qty || 0,
            issued_qty: row.issued_qty || 0,
            previous_balance: row.previous_balance,
            balance: row.new_balance, // Balance Stock automatically tracked
            reference_no: row.reference_no || '-',
            user_name: row.user_name || 'System / Admin',
            user_role: row.user_role || 'admin',
            notes: row.notes || ''
        }));

        res.json(formatted);
    } catch (error) {
        console.error('GET LEDGER ERROR:', error);
        res.status(500).json({ message: 'Error fetching stock ledger', error: error.message });
    }
};

// Update ledger log entry (Admin) with Automatic Stock Rebalancing
exports.updateLedger = async (req, res) => {
    const { id } = req.params;
    const { reference_no, notes, transaction_type, received_qty, issued_qty } = req.body;

    try {
        const [existing] = await db.query('SELECT * FROM stationary_ledger WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Ledger entry not found' });

        const oldLog = existing[0];
        const itemId = oldLog.item_id;
        const oldType = oldLog.transaction_type;
        const oldRec = Number(oldLog.received_qty || 0);
        const oldIss = Number(oldLog.issued_qty || 0);

        const newType = transaction_type || oldType;
        const newRec = received_qty !== undefined ? Number(received_qty) : oldRec;
        const newIss = issued_qty !== undefined ? Number(issued_qty) : oldIss;

        // Fetch current item stock
        const [itemData] = await db.query('SELECT available_stock, total_stock FROM stationary_items WHERE id = ?', [itemId]);
        if (itemData.length === 0) return res.status(404).json({ message: 'Item associated with ledger entry not found' });

        let currentAvailable = itemData[0].available_stock;
        let currentTotal = itemData[0].total_stock;

        // Step 1: Revert oldLog stock effect
        if (oldType === 'RECEIVED' || oldType === 'RESTOCK') {
            currentAvailable = Math.max(0, currentAvailable - oldRec);
            currentTotal = Math.max(0, currentTotal - oldRec);
        } else if (oldType === 'ISSUED') {
            currentAvailable = currentAvailable + oldIss;
        } else if (oldType === 'RETURNED') {
            currentAvailable = Math.max(0, currentAvailable - (oldRec || oldIss));
        }

        // Step 2: Apply newLog stock effect
        if (newType === 'RECEIVED' || newType === 'RESTOCK') {
            currentAvailable = currentAvailable + newRec;
            currentTotal = currentTotal + newRec;
        } else if (newType === 'ISSUED') {
            currentAvailable = Math.max(0, currentAvailable - newIss);
        } else if (newType === 'RETURNED') {
            currentAvailable = currentAvailable + (newRec || newIss);
        }

        // Step 3: Update item stock in stationary_items
        await db.query(
            'UPDATE stationary_items SET available_stock = ?, total_stock = ? WHERE id = ?',
            [currentAvailable, currentTotal, itemId]
        );

        // Step 4: Update ledger entry with recalculated new_balance
        await db.query(
            `UPDATE stationary_ledger 
             SET reference_no = COALESCE(?, reference_no),
                 notes = COALESCE(?, notes),
                 transaction_type = COALESCE(?, transaction_type),
                 received_qty = COALESCE(?, received_qty),
                 issued_qty = COALESCE(?, issued_qty),
                 new_balance = ?
             WHERE id = ?`,
            [reference_no, notes, newType, newRec, newIss, currentAvailable, id]
        );

        res.json({ message: 'Ledger log entry updated and stock inventory rebalanced successfully' });
    } catch (error) {
        console.error('UPDATE LEDGER ERROR:', error);
        res.status(500).json({ message: 'Error updating ledger entry', error: error.message });
    }
};

// Delete ledger log entry (Admin) with Automatic Stock Rebalancing
exports.deleteLedger = async (req, res) => {
    const { id } = req.params;

    try {
        const [existing] = await db.query('SELECT * FROM stationary_ledger WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Ledger entry not found' });

        const oldLog = existing[0];
        const itemId = oldLog.item_id;
        const oldType = oldLog.transaction_type;
        const oldRec = Number(oldLog.received_qty || 0);
        const oldIss = Number(oldLog.issued_qty || 0);

        // Fetch current item stock
        const [itemData] = await db.query('SELECT available_stock, total_stock FROM stationary_items WHERE id = ?', [itemId]);
        if (itemData.length > 0) {
            let currentAvailable = itemData[0].available_stock;
            let currentTotal = itemData[0].total_stock;

            // Revert oldLog stock effect
            if (oldType === 'RECEIVED' || oldType === 'RESTOCK') {
                currentAvailable = Math.max(0, currentAvailable - oldRec);
                currentTotal = Math.max(0, currentTotal - oldRec);
            } else if (oldType === 'ISSUED') {
                currentAvailable = currentAvailable + oldIss;
            } else if (oldType === 'RETURNED') {
                currentAvailable = Math.max(0, currentAvailable - (oldRec || oldIss));
            }

            // Update item stock in stationary_items
            await db.query(
                'UPDATE stationary_items SET available_stock = ?, total_stock = ? WHERE id = ?',
                [currentAvailable, currentTotal, itemId]
            );
        }

        await db.query('DELETE FROM stationary_ledger WHERE id = ?', [id]);
        res.json({ message: 'Ledger log entry deleted and stock inventory rebalanced successfully' });
    } catch (error) {
        console.error('DELETE LEDGER ERROR:', error);
        res.status(500).json({ message: 'Error deleting ledger entry', error: error.message });
    }
};

// --- REPORTS & ANALYTICS (Admin / HOD) ---

// Get summary reports, user statistics, top consumed items graph data
exports.getAdminReports = async (req, res) => {
    try {
        // Fetch users
        const [users] = await db.query(
            `SELECT id as user_id, name as user_name, email as user_email, role as user_role, COALESCE(stationary_blocked, false) as is_blocked FROM users`
        );

        // Fetch stationary requests with item details
        let requests = [];
        try {
            const [reqRes] = await db.query(`
                SELECT r.id, r.user_id, r.item_id, r.quantity, r.status, r.requested_at,
                       COALESCE(r.unit, i.unit, 'pcs') as unit,
                       i.item_name, i.category
                FROM stationary_requests r
                JOIN stationary_items i ON r.item_id = i.id
            `);
            requests = Array.isArray(reqRes) ? reqRes : [];
        } catch (e) {
            console.error("Error fetching requests for admin reports:", e.message);
        }

        const userReportsMap = {};
        
        (users || []).forEach(u => {
            userReportsMap[u.user_id] = {
                user_id: u.user_id,
                user_name: u.user_name || 'Unknown',
                user_email: u.user_email || '',
                user_role: u.user_role || 'user',
                is_blocked: Number(u.is_blocked || 0),
                total_requests: 0,
                approved_requests: 0,
                total_items_consumed: 0,
                item_totals: {},
                last_request_date: null
            };
        });

        const topItemsMap = {};
        const categoryMap = {};

        requests.forEach(r => {
            const uId = r.user_id;
            
            if (!userReportsMap[uId]) {
                userReportsMap[uId] = {
                    user_id: uId,
                    user_name: r.user_name || `User #${uId}`,
                    user_email: r.user_email || '',
                    user_role: r.user_role || 'user',
                    is_blocked: 0,
                    total_requests: 0,
                    approved_requests: 0,
                    total_items_consumed: 0,
                    item_totals: {},
                    last_request_date: null
                };
            }

            const uReport = userReportsMap[uId];
            uReport.total_requests += 1;

            if (r.requested_at) {
                if (!uReport.last_request_date || new Date(r.requested_at) > new Date(uReport.last_request_date)) {
                    uReport.last_request_date = r.requested_at;
                }
            }

            if (r.status === 'Approved') {
                uReport.approved_requests += 1;
                const qty = Number(r.quantity || 0);
                uReport.total_items_consumed += qty;
                
                const itemKey = r.item_name || 'Unknown Item';
                uReport.item_totals[itemKey] = (uReport.item_totals[itemKey] || 0) + qty;

                if (!topItemsMap[r.item_id]) {
                    topItemsMap[r.item_id] = {
                        item_name: r.item_name,
                        category: r.category,
                        unit: r.unit,
                        total_consumed: 0
                    };
                }
                topItemsMap[r.item_id].total_consumed += qty;

                const catKey = r.category || 'General';
                categoryMap[catKey] = (categoryMap[catKey] || 0) + qty;
            }
        });

        const reports = Object.values(userReportsMap)
            .filter(u => u.total_requests > 0 || u.total_items_consumed > 0)
            .map(u => {
                const detailsArr = Object.entries(u.item_totals).map(([name, qty]) => `${name} (${qty})`);
                const detailed_consumption = detailsArr.length > 0 ? detailsArr.join(', ') : '-';
                
                let top_item = '-';
                let maxQty = 0;
                Object.entries(u.item_totals).forEach(([name, qty]) => {
                    if (qty > maxQty) {
                        maxQty = qty;
                        top_item = `${name} (${qty})`;
                    }
                });

                return {
                    user_id: u.user_id,
                    user_name: u.user_name,
                    user_email: u.user_email,
                    user_role: u.user_role,
                    is_blocked: u.is_blocked,
                    total_requests: u.total_requests,
                    approved_requests: u.approved_requests,
                    total_items_consumed: u.total_items_consumed,
                    detailed_consumption,
                    last_request_date: u.last_request_date,
                    top_item
                };
            })
            .sort((a, b) => b.total_items_consumed - a.total_items_consumed);

        const topItems = Object.values(topItemsMap)
            .sort((a, b) => b.total_consumed - a.total_consumed)
            .slice(0, 10);

        const categoryBreakdown = Object.entries(categoryMap).map(([category, total_qty]) => ({
            category,
            total_qty
        }));

        res.json({
            reports,
            topItems,
            categoryBreakdown
        });
    } catch (error) {
        console.error('GET REPORTS ERROR:', error);
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
};

// Get detailed report for a specific user (Teacher / Student)
exports.getTeacherReportDetails = async (req, res) => {
    const { userId } = req.params;
    try {
        const query = `
            SELECT 
                r.id,
                r.requested_at,
                r.acted_at,
                r.quantity,
                r.reason,
                r.status,
                i.item_name,
                i.category,
                i.unit
            FROM stationary_requests r
            JOIN stationary_items i ON r.item_id = i.id
            WHERE r.user_id = ?
            ORDER BY r.requested_at DESC
        `;
        const [details] = await db.query(query, [userId]);

        const [userDb] = await db.query('SELECT name, email, role FROM users WHERE id = ?', [userId]);
        const user = userDb[0] || { name: 'Unknown', role: 'User' };

        res.json({ user, details });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user details', error: error.message });
    }
};

// Toggle user block status for stationary requests
exports.toggleUserBlock = async (req, res) => {
    const { userId } = req.params;
    try {
        const [user] = await db.query('SELECT stationary_blocked FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(404).json({ message: 'User not found' });

        const newStatus = !user[0].stationary_blocked;
        await db.query('UPDATE users SET stationary_blocked = ? WHERE id = ?', [newStatus, userId]);

        res.json({ message: `Access ${newStatus ? 'blocked' : 'unblocked'} successfully`, is_blocked: newStatus });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};
// Bulk Update Requests (Admin/HOD) — Approve or Reject multiple at once
exports.bulkUpdateRequests = async (req, res) => {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'No request IDs provided' });
    }
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be Approved or Rejected' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const id of ids) {
        try {
            const [requestData] = await db.query('SELECT * FROM stationary_requests WHERE id = ?', [id]);
            if (requestData.length === 0) { results.failed++; continue; }

            const request = requestData[0];
            if (request.status !== 'Pending') { results.failed++; continue; } // skip non-pending

            const prevQty = Number(request.quantity);
            const itemId = request.item_id;

            const [itemData] = await db.query('SELECT available_stock, min_stock_limit, item_name, unit FROM stationary_items WHERE id = ?', [itemId]);
            if (itemData.length === 0) { results.failed++; continue; }

            let currentAvailable = Number(itemData[0].available_stock);

            if (status === 'Approved') {
                if (currentAvailable < prevQty) { results.failed++; results.errors.push(`#${id}: Not enough stock`); continue; }
                currentAvailable -= prevQty;
                await db.query('UPDATE stationary_items SET available_stock = ? WHERE id = ?', [currentAvailable, itemId]);
                await db.query(
                    `INSERT INTO stationary_ledger (item_id, transaction_type, received_qty, issued_qty, previous_balance, new_balance, reference_no, user_id, notes)
                     VALUES (?, 'ISSUED', 0, ?, ?, ?, ?, ?, 'Bulk Approved')`,
                    [itemId, prevQty, itemData[0].available_stock, currentAvailable, `REQ-#${id}`, request.user_id]
                );
                // Low stock check
                if (currentAvailable < Number(itemData[0].min_stock_limit)) {
                    await notifyAdmins(`⚠️ Low Stock Alert: "${itemData[0].item_name}" only ${currentAvailable} ${itemData[0].unit} left after bulk approval.`, 'alert');
                }
            }

            await db.query(
                "UPDATE stationary_requests SET status = ?, acted_at = NOW() WHERE id = ?",
                [status, id]
            );
            results.success++;
        } catch (err) {
            results.failed++;
            results.errors.push(`#${id}: ${err.message}`);
        }
    }

    res.json({
        message: `Bulk update done: ${results.success} updated, ${results.failed} failed.`,
        ...results
    });
};
