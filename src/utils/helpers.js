

export function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming +1 for US, modify as needed)
    let formatted = cleaned;
    if (cleaned.length === 10) {
        formatted = '1' + cleaned; // Add US country code
    }
    
    return formatted + '@s.whatsapp.net';
}

export function formatGroupId(groupId) {
    // Group IDs usually end with @g.us
    if (!groupId.includes('@')) {
        return groupId + '@g.us';
    }
    return groupId;
}

export function extractPhoneFromJid(jidOrNumber) {
    let number = jidOrNumber;
    // Remove WhatsApp suffix if present
    if (number.includes('@')) {
        number = number.split('@')[0];
    }
    // Add plus if not present
    if (!number.startsWith('+')) {
        number = '+' + number;
    }
    // Format with spaces (basic, for readability)
    if (number.length > 8) {
        // Example for India: +91 98765 43210
        return number.replace(/^(\+\d{1,3})(\d{5})(\d{5,})$/, '$1 $2 $3');
    }
    return number;
}

export function isGroupMessage(jid) {
    return jid.includes('@g.us');
}

export function isPrivateMessage(jid) {
    return jid.includes('@s.whatsapp.net');
}

// Helper to validate WhatsApp ID format
export function isValidWhatsAppId(jid) {
    return jid.includes('@s.whatsapp.net') || jid.includes('@g.us');
}
