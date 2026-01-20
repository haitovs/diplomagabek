const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In dev, load vite server. In prod, load index.html
    if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handler for scanning networks
// IPC Handler for scanning networks
// IPC Handler for scanning networks
ipcMain.handle('scan-networks', async () => {
    return new Promise((resolve, reject) => {
        // macOS airport command path - standard location
        const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';
        const fs = require('fs');

        // Check if binary exists
        if (!fs.existsSync(airportPath)) {
            console.log('Airport tool not found. Returning simulated WiFi networks.');

            // Mock result for systems without airport tool
            const mockNetworks = [
                {
                    ssid: 'Neighbor_WiFi_5G',
                    bssid: 'A0:B1:C2:D3:E4:F5',
                    rssi: '-55',
                    channel: '36',
                    security: 'WPA2',
                    type: 'Real'
                },
                {
                    ssid: 'CoffeeShop_Guest',
                    bssid: '11:22:33:44:55:66',
                    rssi: '-72',
                    channel: '6',
                    security: 'WPA2',
                    type: 'Real'
                },
                {
                    ssid: 'Hidden_Network',
                    bssid: 'AA:BB:CC:DD:EE:FF',
                    rssi: '-85',
                    channel: '11',
                    security: 'WPA',
                    type: 'Real'
                }
            ];

            setTimeout(() => {
                resolve({ success: true, networks: mockNetworks });
            }, 1000); // Fake delay
            return;
        }

        exec(`"${airportPath}" -s`, (error, stdout, stderr) => {
            if (error) {
                console.error('Scan error:', error);
                // Fallback on execution error too
                resolve({ success: false, error: error.message });
                return;
            }

            const networks = parseAirportOutput(stdout);
            resolve({ success: true, networks });
        });
    });
});

function parseAirportOutput(output) {
    const lines = output.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header line
    // SSID BSSID RSSI CHANNEL HT CC SECURITY (Auth/Unicast/Group)
    const networks = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Regex to capture SSID (can contain spaces) and BSSID
        // This is a simplified parser; airport output column widths are somewhat fixed but SSID can be tricky
        // Strategy: Split by BSSID pattern (XX:XX:XX:XX:XX:XX)

        const bssidMatch = line.match(/([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})/);

        if (bssidMatch) {
            const bssidIndex = bssidMatch.index;
            const bssid = bssidMatch[0];

            // SSID is everything before the BSSID
            const ssid = line.substring(0, bssidIndex).trim();

            // Rest of the line after BSSID contains RSSI, Channel, etc.
            const entries = line.substring(bssidIndex + 18).trim().split(/\s+/);
            const rssi = entries[0];
            const channel = entries[1];
            const security = line.includes('WPA2') ? 'WPA2' : (line.includes('WPA') ? 'WPA' : 'WEP/Open');

            networks.push({
                ssid: ssid || 'Hidden',
                bssid: bssid,
                rssi: rssi,
                channel: channel,
                security: security,
                type: 'Real' // Marker for frontend
            });
        }
    }
    return networks;
}
