
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
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    if (minutes < 60) return `${minutes} minutes ${seconds} seconds`;
    const hours = Math.floor(minutes / 60);
    minutes %= 60;
    return `${hours} hours ${minutes} minutes ${seconds} seconds`;
}


// will add more in future