/**
 * Ticket State Manager
 * Handles in-memory state for active tickets.
 */

const TICKET_STATES = {
    OPEN_SUPPORT: 'OPEN_SUPPORT',
    OPEN_SALES_SELECT_PLAN: 'OPEN_SALES_SELECT_PLAN',
    WAITING_PAYMENT_PROOF: 'WAITING_PAYMENT_PROOF',
    WAITING_STAFF_APPROVAL: 'WAITING_STAFF_APPROVAL',
    APPROVED_ONBOARDING_SENT: 'APPROVED_ONBOARDING_SENT',
    REJECTED: 'REJECTED',
    CLOSED: 'CLOSED'
};

const activeTickets = new Map();

const TicketState = {
    STATES: TICKET_STATES,

    get: (channelId) => activeTickets.get(channelId),

    set: (channelId, data) => activeTickets.set(channelId, data),

    delete: (channelId) => activeTickets.delete(channelId),

    getAll: () => activeTickets,

    existsForUser: (userId) => {
        return [...activeTickets.values()].find(t => t.userId === userId && t.state !== TICKET_STATES.CLOSED);
    }
};

module.exports = TicketState;
