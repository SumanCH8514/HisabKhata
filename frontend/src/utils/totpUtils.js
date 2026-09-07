const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const generateTotpSecret = (length = 16) => {
    const randomBytes = new Uint8Array(length);
    window.crypto.getRandomValues(randomBytes);
    let secret = '';
    for (let i = 0; i < length; i++) {
        secret += BASE32_ALPHABET[randomBytes[i] % BASE32_ALPHABET.length];
    }
    return secret;
};

export const generateBackupCodes = (count = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes = [];
    for (let i = 0; i < count; i++) {
        const bytes = new Uint8Array(8);
        window.crypto.getRandomValues(bytes);
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars[bytes[j] % chars.length];
        }
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
};

const base32ToUint8Array = (base32) => {
    if (!base32) return new Uint8Array(0);
    const cleaned = base32.replace(/[\s=-]/g, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        const val = BASE32_ALPHABET.indexOf(char);
        if (val === -1) continue;
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return new Uint8Array(bytes);
};

export const generateTotpToken = async (secret, timeStepOffset = 0) => {
    const keyBytes = base32ToUint8Array(secret);
    if (keyBytes.length === 0) return '';
    const key = await window.crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / 30) + timeStepOffset;

    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    counterView.setUint32(4, counter, false);

    const signature = await window.crypto.subtle.sign('HMAC', key, counterBuffer);
    const hmacBytes = new Uint8Array(signature);

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
        ((hmacBytes[offset] & 0x7f) << 24) |
        ((hmacBytes[offset + 1] & 0xff) << 16) |
        ((hmacBytes[offset + 2] & 0xff) << 8) |
        (hmacBytes[offset + 3] & 0xff);

    const token = (binary % 1000000).toString().padStart(6, '0');
    return token;
};

export const verifyTotpCode = async (inputCode, secret, backupCodes = []) => {
    if (!inputCode || !secret) return { valid: false };
    const cleanCode = inputCode.trim().replace(/\s+/g, '');

    if (Array.isArray(backupCodes) && backupCodes.length > 0) {
        const cleanBackup = cleanCode.replace(/-/g, '').toUpperCase();
        const matchBackup = backupCodes.find(bc => bc.replace(/-/g, '').toUpperCase() === cleanBackup);
        if (matchBackup) {
            return { valid: true, isBackup: true, usedCode: matchBackup };
        }
    }

    if (!/^\d{6}$/.test(cleanCode)) return { valid: false };

    for (let offset = -1; offset <= 1; offset++) {
        const generated = await generateTotpToken(secret, offset);
        if (generated === cleanCode) {
            return { valid: true, isBackup: false };
        }
    }
    return { valid: false };
};

export const getTotpUri = (secret, accountName = 'User', issuer = 'HisabKhata') => {
    const encodedAccount = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
};

export const getQrCodeUrl = (totpUri, size = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(totpUri)}`;
};
