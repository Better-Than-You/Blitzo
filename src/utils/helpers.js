
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

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

export function formatDuration(seconds) {
    try {
        if (seconds <= 0) return '0s';
        const days = Math.floor(seconds / 86400) > 0 ? Math.floor(seconds / 86400) + 'd ' : '';
        const hours = Math.floor(seconds / 3600) > 0 ? Math.floor(seconds / 3600) + 'h ' : '';
        const minutes = Math.floor((seconds % 3600) / 60) > 0 ? Math.floor((seconds % 3600) / 60) + 'm ' : '';
        const remainingSeconds = Math.round(seconds % 60); 
        return days + hours + minutes + remainingSeconds + 's';
    } catch (error) {
        console.error('Error formatting duration:', error);
        return '0s';
    }
}


// will add more in future