// FILE: src/discord/commands/setup/handlers/index.js
// Export all setup handlers

const { handleChannelsSetup } = require('./channels');
const { handleLanguageSetup } = require('./language');
const { handleStaffSetup } = require('./staff');
const { handleAlertasSetup } = require('./alerts');
const { handleViewConfig } = require('./view');

module.exports = {
    handleChannelsSetup,
    handleLanguageSetup,
    handleStaffSetup,
    handleAlertasSetup,
    handleViewConfig,
};
