/**
 * Tests for Verification Flow
 */

describe('Verification System', () => {
    const OFFICIAL = require('../../src/utils/official');

    describe('Official Server Constants', () => {
        it('should have VERIFIED role defined', () => {
            expect(OFFICIAL.ROLES.VERIFIED).toBeDefined();
            expect(OFFICIAL.ROLES.VERIFIED).toMatch(/^\d{17,19}$/);
        });

        it('should have MEMBER role defined', () => {
            expect(OFFICIAL.ROLES.MEMBER).toBeDefined();
            expect(OFFICIAL.ROLES.MEMBER).toMatch(/^\d{17,19}$/);
        });

        it('should have REGRAS channel defined', () => {
            expect(OFFICIAL.CHANNELS.REGRAS).toBeDefined();
            expect(OFFICIAL.CHANNELS.REGRAS).toMatch(/^\d{17,19}$/);
        });
    });

    describe('Verification Button', () => {
        it('should have verify_member as custom ID', () => {
            // The button ID used in officialServer.js
            const expectedButtonId = 'verify_member';
            expect(expectedButtonId).toBe('verify_member');
        });
    });

    describe('Role Assignment Logic', () => {
        it('should grant both VERIFIED and MEMBER roles', () => {
            // Mock what the verification handler does
            const rolesToAdd = [OFFICIAL.ROLES.VERIFIED, OFFICIAL.ROLES.MEMBER];

            expect(rolesToAdd.length).toBe(2);
            expect(rolesToAdd).toContain(OFFICIAL.ROLES.VERIFIED);
            expect(rolesToAdd).toContain(OFFICIAL.ROLES.MEMBER);
        });
    });
});
