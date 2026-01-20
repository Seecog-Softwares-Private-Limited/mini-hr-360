
import fs from 'fs';
try {
    const content = fs.readFileSync('verification.log', 'utf16le');
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.includes('AttendanceDailySummary')) {
            console.log(line.trim());
        }
    });
} catch (e) {
    console.log('Error reading utf16le, checking utf8...');
    try {
        const contentUtf8 = fs.readFileSync('verification.log', 'utf8');
        const lines = contentUtf8.split('\n');
        lines.forEach(line => {
            if (line.includes('AttendanceDailySummary')) {
                console.log(line.trim());
            }
        });
    } catch (e2) {
        console.error("Could not read file:", e2.message);
    }
}
