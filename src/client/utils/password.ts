/**
 * Calculate password entropy.
 * 
 * Formula: E = L * log2(R)
 * L = Password length
 * R = Pool size
 */
export function calculateEntropy(password: string): number {
    if (!password) return 0;

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

    if (poolSize === 0) return 0;

    const entropy = password.length * Math.log2(poolSize);
    return Math.round(entropy);
}

export function getStrengthLabel(entropy: number): { label: string; color: string; score: number } {
    if (entropy < 28) return { label: 'Very Weak', color: '#ff4d4d', score: 1 };
    if (entropy < 36) return { label: 'Weak', color: '#ffad33', score: 2 };
    if (entropy < 60) return { label: 'Good', color: '#ffdb4d', score: 3 };
    if (entropy < 128) return { label: 'Strong', color: '#33cc33', score: 4 };
    return { label: 'Very Strong', color: '#009900', score: 5 };
}
