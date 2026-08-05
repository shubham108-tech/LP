const db = require('../config/db');

// Get all module statuses
exports.getModules = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT module_key, module_name, is_enabled FROM system_modules');
        
        // Convert to key-value map e.g. { browse_books: true, assignments: false, ... }
        const modulesMap = {};
        if (Array.isArray(rows)) {
            rows.forEach(r => {
                modulesMap[r.module_key] = Boolean(r.is_enabled);
            });
        }

        res.json({
            success: true,
            modules: modulesMap,
            raw: rows
        });
    } catch (error) {
        console.error('Error fetching system modules:', error);
        res.status(500).json({ message: 'Failed to fetch modules', error: error.message });
    }
};

// Update module status (Admin Only)
exports.updateModules = async (req, res) => {
    try {
        const { modules, module_key, is_enabled } = req.body;

        // Single module toggle update
        if (module_key !== undefined && is_enabled !== undefined) {
            const enabledVal = is_enabled ? true : false;
            await db.query(
                'UPDATE system_modules SET is_enabled = ?, updated_at = NOW() WHERE module_key = ?',
                [enabledVal, module_key]
            );
            return res.json({ message: `Module "${module_key}" updated successfully` });
        }

        // Bulk module update
        if (modules && typeof modules === 'object') {
            for (const [key, val] of Object.entries(modules)) {
                const enabledVal = val ? true : false;
                await db.query(
                    'UPDATE system_modules SET is_enabled = ?, updated_at = NOW() WHERE module_key = ?',
                    [enabledVal, key]
                );
            }
            return res.json({ message: 'Modules updated successfully' });
        }

        res.status(400).json({ message: 'Invalid payload for module update' });
    } catch (error) {
        console.error('Error updating system modules:', error);
        res.status(500).json({ message: 'Failed to update modules', error: error.message });
    }
};
