
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
    if (number.length > 8) {
        // Add space bw $2$3 to make to look like +123 45678 9012
        return number.replace(/^(\+\d{1,3})(\d{5})(\d{5,})$/, '$1 $2$3');
    }
    return number;
}

// will add more in future