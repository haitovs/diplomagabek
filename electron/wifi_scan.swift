import CoreWLAN
import Foundation

// Struct for JSON output
struct WifiNetwork: Codable {
    let ssid: String
    let bssid: String
    let rssi: Int
    let channel: Int
    let security: String
    let type: String
}

class WiFiScanner: NSObject {
    let client: CWWiFiClient

    override init() {
        self.client = CWWiFiClient.shared()
    }

    func scan() {
        guard let interface = client.interface() else {
            printError("Could not access Wi-Fi interface")
            return
        }
        
        do {
            // scanForNetworks(withSSID: nil) returns Set<CWNetwork>
            let networks = try interface.scanForNetworks(withSSID: nil)
            
            var result: [WifiNetwork] = []
            
            for network in networks {
                result.append(WifiNetwork(
                    ssid: network.ssid ?? "Hidden",
                    bssid: network.bssid ?? "",
                    rssi: network.rssiValue,
                    channel: network.wlanChannel?.channelNumber ?? 0,
                    security: getSecurity(network),
                    type: "Real"
                ))
            }
            
            // Sort by RSSI (strongest first)
            result.sort { $0.rssi > $1.rssi }
            
            let jsonData = try JSONSerialization.data(withJSONObject: result.map { [
                "ssid": $0.ssid,
                "bssid": $0.bssid,
                "rssi": String($0.rssi),
                "channel": String($0.channel),
                "security": $0.security,
                "type": $0.type
            ] }, options: .prettyPrinted)
            
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            }
            
        } catch {
            printError("Error scanning networks: \(error)")
        }
    }
    
    func getSecurity(_ network: CWNetwork) -> String {
        if network.supportsSecurity(.wpa2Personal) { return "WPA2" }
        if network.supportsSecurity(.wpaPersonal) { return "WPA" }
        if network.supportsSecurity(.wpaEnterprise) { return "WPA-Ent" }
        if network.supportsSecurity(.dynamicWEP) { return "WEP" }
        if network.supportsSecurity(.none) { return "Open" }
        return "Unknown"
    }
    
    func printError(_ message: String) {
        // Create a simple JSON error
        print("[]")
        fputs("\(message)\n", stderr)
        exit(1)
    }
}

let scanner = WiFiScanner()
scanner.scan()
