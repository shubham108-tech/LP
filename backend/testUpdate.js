require('dotenv').config();
const db = require('./config/db');

async function test() {
    try {
        const [existingArr] = await db.query('SELECT * FROM stationary_items LIMIT 1');
        if (existingArr.length === 0) {
            console.log('No items to test');
            return;
        }
        
        const id = existingArr[0].id;
        const add_stock = 10;
        
        const existing = existingArr[0];

        let currentTotal = existing.total_stock;
        let currentAvailable = existing.available_stock;

        const updateName = existing.item_name;
        const updateCategory = existing.category;
        const updateMinLimit = existing.min_stock_limit;
        const updateUnit = existing.unit;

        let queryParams = [updateName, updateCategory, updateMinLimit, updateUnit];
        let queryStr = 'UPDATE stationary_items SET item_name = ?, category = ?, min_stock_limit = ?, unit = ?';

        // Add to stock logic
        if (add_stock && !isNaN(add_stock)) {
            const extra = parseInt(add_stock);
            currentTotal += extra;
            currentAvailable += extra;
        }
        
        queryStr += ', total_stock = ?, available_stock = ?';
        queryParams.push(currentTotal, currentAvailable);

        queryStr += ' WHERE id = ?';
        queryParams.push(id);

        console.log('Executing:', queryStr, queryParams);
        const [result] = await db.query(queryStr, queryParams);
        console.log('Success:', result);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}
test();
