const guardian = require('../../src/discord/services/guardian');
const OFFICIAL = require('../../src/utils/official');

// Mock Dependencies
jest.mock('../../src/utils/logger', () => ({
    child: () => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    })
}));

describe('Guardian Service', () => {
    let mockMessage;

    beforeEach(() => {
        mockMessage = {
            content: 'Hello World',
            author: {
                id: 'USER_123',
                bot: false,
                send: jest.fn().mockResolvedValue(true),
                tag: 'User#123'
            },
            member: {
                roles: {
                    cache: new Map()
                }
            },
            guild: {
                channels: {
                    cache: new Map()
                }
            },
            delete: jest.fn().mockResolvedValue(true),
            deletable: true
        };
    });

    test('should allow safe content', async () => {
        const result = await guardian.checkContentSafety(mockMessage);
        expect(result).toBe(true);
        expect(mockMessage.delete).not.toHaveBeenCalled();
    });

    test('should delete sales attempts', async () => {
        mockMessage.content = 'vendo bot barato chama no pv';
        const result = await guardian.checkContentSafety(mockMessage);

        expect(result).toBe(false);
        expect(mockMessage.delete).toHaveBeenCalled();
        expect(mockMessage.author.send).toHaveBeenCalled();
    });

    test('should delete insults', async () => {
        mockMessage.content = 'esse bot é um lixo scam';
        const result = await guardian.checkContentSafety(mockMessage);

        expect(result).toBe(false);
        expect(mockMessage.delete).toHaveBeenCalled();
    });

    test('should ignore Owner', async () => {
        mockMessage.author.id = OFFICIAL.OWNER_ID;
        mockMessage.content = 'vendo bot barato'; // Owner can say whatever

        const result = await guardian.checkContentSafety(mockMessage);
        expect(result).toBe(true);
        expect(mockMessage.delete).not.toHaveBeenCalled();
    });

    test('should ignore Staff', async () => {
        mockMessage.member.roles.cache.set(OFFICIAL.ROLES.STAFF, {});
        mockMessage.content = 'vendo bot proibido';

        const result = await guardian.checkContentSafety(mockMessage);
        expect(result).toBe(true);
    });

    test('should ignore Bots', async () => {
        mockMessage.author.bot = true;
        mockMessage.content = 'vendo bot barato';

        const result = await guardian.checkContentSafety(mockMessage);
        expect(result).toBe(true);
    });
});
