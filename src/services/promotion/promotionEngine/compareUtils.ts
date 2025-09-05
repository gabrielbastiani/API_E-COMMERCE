import { Operator } from "@prisma/client";

export function compareNumber(actual: number, operator: Operator, expected: number): boolean {
    switch (operator) {
        case Operator.EQUAL: return actual === expected;
        case Operator.NOT_EQUAL: return actual !== expected;
        case Operator.GREATER: return actual > expected;
        case Operator.GREATER_EQUAL: return actual >= expected;
        case Operator.LESS: return actual < expected;
        case Operator.LESS_EQUAL: return actual <= expected;
        default: return false;
    }
}

export function compareBoolean(actual: boolean, operator: Operator, expected: boolean): boolean {
    return operator === Operator.EQUAL ? actual === expected : actual !== expected;
}

export function compareArray(actual: string[], operator: Operator, expected: string[], matchAll = false): boolean {
    const a = Array.isArray(actual) ? actual.filter(Boolean) : [];
    const e = Array.isArray(expected) ? expected.filter(Boolean) : [];

    switch (operator) {
        case Operator.CONTAINS:
            if (e.length === 0) return false;
            return matchAll ? e.every((v) => a.includes(v)) : e.some((v) => a.includes(v));
        case Operator.NOT_CONTAINS:
            if (e.length === 0) return true;
            return e.every((v) => !a.includes(v));
        case Operator.EQUAL:
            return a.length === e.length && e.every((v) => a.includes(v));
        case Operator.NOT_EQUAL:
            return !(a.length === e.length && e.every((v) => a.includes(v)));
        default:
            return false;
    }
}