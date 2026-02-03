// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getOrdinal, getCookie } from '../../../src/client/utils/utils.ts';

describe('Frontend Utils', () => {
    describe('getOrdinal', () => {
        it('should return correct ordinal for standard numbers', () => {
            expect(getOrdinal(1)).toBe('1st');
            expect(getOrdinal(2)).toBe('2nd');
            expect(getOrdinal(3)).toBe('3rd');
            expect(getOrdinal(4)).toBe('4th');
        });

        it('should return correct ordinal for teens', () => {
            expect(getOrdinal(11)).toBe('11th');
            expect(getOrdinal(12)).toBe('12th');
            expect(getOrdinal(13)).toBe('13th');
        });

        it('should return correct ordinal for higher numbers', () => {
            expect(getOrdinal(21)).toBe('21st');
            expect(getOrdinal(22)).toBe('22nd');
            expect(getOrdinal(101)).toBe('101st');
            expect(getOrdinal(111)).toBe('111th');
        });

        it('should return placeholder for invalid inputs', () => {
            expect(getOrdinal(0)).toBe('-');
            expect(getOrdinal(-1)).toBe('-');
            expect(getOrdinal(null)).toBe('-');
            expect(getOrdinal(undefined)).toBe('-');
        });
    });

    describe('getCookie', () => {
        beforeEach(() => {
            // Mock document.cookie
            Object.defineProperty(document, 'cookie', {
                writable: true,
                value: '',
            });
        });

        it('should retrieve an existing cookie', () => {
            document.cookie = 'testCookie=testValue';
            expect(getCookie('testCookie')).toBe('testValue');
        });

        it('should return null for non-existent cookie', () => {
            document.cookie = 'testCookie=testValue';
            expect(getCookie('otherCookie')).toBeNull();
        });

        it('should retrieve cookie from multiple cookies', () => {
            document.cookie = 'cookie1=value1; cookie2=value2; cookie3=value3';
            expect(getCookie('cookie2')).toBe('value2');
        });
    });
});