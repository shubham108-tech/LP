const db = require('./config/db');

async function test() {
    try {
        const query = `
            SELECT 
                u.id as user_id, 
                u.name as user_name,
                (
                    SELECT GROUP_CONCAT(CONCAT(i.item_name, ' (', item_totals.total_qty, ')') SEPARATOR ', ')
                    FROM (
                        SELECT r2.item_id, SUM(r2.quantity) as total_qty
                        FROM stationary_requests r2
                        WHERE r2.user_id = u.id AND r2.status = 'Approved'
                        GROUP BY r2.item_id
                    ) item_totals
                    JOIN stationary_items i ON item_totals.item_id = i.id
                ) AS detailed_consumption
            FROM users u
            JOIN stationary_requests r ON u.id = r.user_id
            GROUP BY u.id, u.name
        `;
        const [res] = await db.query(query);
        console.log(res);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
