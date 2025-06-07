#[cfg(target_os = "macos")]
mod wifi_macos {
    use crate::LocationConnectivityError;
    use std::process::Command;

    // Uses multiple commands as fallbacks since macOS WiFi detection methods vary by system configuration
    pub fn get_wifi_ssid() -> Result<Option<String>, LocationConnectivityError> {
        tracing::debug!("Attempting WiFi SSID detection");
        
        match get_ssid_via_networksetup() {
            Ok(Some(ssid)) => {
                tracing::debug!("WiFi SSID detected via networksetup: {}", ssid);
                return Ok(Some(ssid));
            }
            Ok(None) => tracing::debug!("No SSID found via networksetup"),
            Err(e) => tracing::debug!("networksetup method failed: {}", e),
        }
        
        match get_ssid_via_airport() {
            Ok(Some(ssid)) => {
                tracing::debug!("WiFi SSID detected via airport: {}", ssid);
                return Ok(Some(ssid));
            }
            Ok(None) => tracing::debug!("No SSID found via airport"),
            Err(e) => tracing::debug!("airport method failed: {}", e),
        }
        
        match get_ssid_via_system_profiler() {
            Ok(Some(ssid)) => {
                tracing::debug!("WiFi SSID detected via system_profiler: {}", ssid);
                return Ok(Some(ssid));
            }
            Ok(None) => tracing::debug!("No SSID found via system_profiler"),
            Err(e) => tracing::debug!("system_profiler method failed: {}", e),
        }
        
        tracing::debug!("No WiFi SSID detected by any method");
        Ok(None)
    }

    fn get_ssid_via_networksetup() -> Result<Option<String>, LocationConnectivityError> {
        // Try common interface names since WiFi interface varies by hardware
        let interfaces = ["en0", "en1", "en2"];
        
        for interface in &interfaces {
            let output = Command::new("networksetup")
                .arg("-getairportnetwork")
                .arg(interface)
                .output()
                .map_err(|e| LocationConnectivityError::WifiDetection(
                    format!("Failed to execute networksetup: {}", e)
                ))?;
            
            if output.status.success() {
                let output_str = String::from_utf8_lossy(&output.stdout);
                
                if let Some(ssid) = parse_networksetup_output(&output_str) {
                    return Ok(Some(ssid));
                }
            }
        }
        
        Ok(None)
    }

    fn get_ssid_via_airport() -> Result<Option<String>, LocationConnectivityError> {
        // Airport command location varies and isn't always available
        let airport_paths = [
            "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport",
            "/usr/local/bin/airport",
        ];
        
        for airport_path in &airport_paths {
            let output = Command::new(airport_path)
                .arg("-I")
                .output();
                
            if let Ok(output) = output {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    
                    if let Some(ssid) = parse_airport_output(&output_str) {
                        return Ok(Some(ssid));
                    }
                }
            } else {
                tracing::debug!("Failed to execute airport command at {}", airport_path);
            }
        }
        
        Ok(None)
    }

    fn get_ssid_via_system_profiler() -> Result<Option<String>, LocationConnectivityError> {
        let output = Command::new("system_profiler")
            .arg("SPAirPortDataType")
            .arg("-json")
            .output()
            .map_err(|e| LocationConnectivityError::WifiDetection(
                format!("Failed to execute system_profiler: {}", e)
            ))?;
        
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout);
            
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output_str) {
                if let Some(ssid) = parse_system_profiler_json(&json) {
                    return Ok(Some(ssid));
                }
            } else {
                tracing::debug!("Failed to parse system_profiler JSON output");
            }
        }
        
        Ok(None)
    }

    fn parse_networksetup_output(output: &str) -> Option<String> {
        for line in output.lines() {
            if line.starts_with("Current Wi-Fi Network:") {
                let ssid = line.replace("Current Wi-Fi Network:", "").trim().to_string();
                // Check if it's a valid SSID (not empty and doesn't contain common error indicators)
                if !ssid.is_empty() && !is_error_message(&ssid) {
                    return Some(ssid);
                }
            }
        }
        None
    }
    
    fn is_error_message(text: &str) -> bool {
        let text_lower = text.to_lowercase();
        // Common error indicators that appear in various languages
        text_lower.contains("not associated") 
            || text_lower.contains("not connected")
            || text_lower.contains("no network")
            || text_lower.contains("airport")  // Often indicates error messages from airport utility
            || text_lower.contains("error")
            || text_lower.starts_with("unable")
            || text_lower.starts_with("failed")
    }

    fn parse_airport_output(output: &str) -> Option<String> {
        for line in output.lines() {
            if line.trim().starts_with("SSID:") {
                let ssid = line.replace("SSID:", "").trim().to_string();
                if !ssid.is_empty() {
                    return Some(ssid);
                }
            }
        }
        None
    }

    fn parse_system_profiler_json(json: &serde_json::Value) -> Option<String> {
        if let Some(airport_data) = json.get("SPAirPortDataType") {
            if let Some(interfaces) = airport_data.as_array() {
                for interface in interfaces {
                    if let Some(networks) = interface.get("spairport_airport_other") {
                        if let Some(networks_array) = networks.as_array() {
                            for network in networks_array {
                                if let Some(current) = network.get("_name") {
                                    if let Some(ssid_str) = current.as_str() {
                                        if network.get("spairport_network_cc").is_some() {
                                            return Some(ssid_str.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    }
}

#[cfg(target_os = "macos")]
pub use wifi_macos::get_wifi_ssid;