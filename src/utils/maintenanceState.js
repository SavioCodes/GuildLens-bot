/**
 * Global state for Maintenance Mode
 * Kept in memory so it resets on restart (Safety feature)
 */

let isMaintenance = false;
let maintenanceReason = 'Atualização de sistema';

module.exports = {
    isEnabled: () => isMaintenance,
    getReason: () => maintenanceReason,
    setMaintenance: (enabled, reason) => {
        isMaintenance = enabled;
        if (reason) maintenanceReason = reason;
    }
};
