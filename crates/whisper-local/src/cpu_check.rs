pub fn is_whisper_compatible() -> bool {
    #[cfg(target_arch = "x86_64")]
    {
        // Check basic requirements
        if !std::arch::is_x86_feature_detected!("sse2") {
            log::error!("CPU missing SSE2 - whisper.cpp not supported");
            return false;
        }

        // Get CPU brand to detect known problematic combinations
        let cpu_brand = get_cpu_brand();
        log::info!("CPU detected: {}", cpu_brand);

        // Known problematic combinations
        if cpu_brand.contains("Intel") && cpu_brand.contains("11th Gen") {
            log::warn!("Intel 11th gen detected - potential whisper compatibility issues");
            // Still allow, but with warning
        }

        true
    }

    #[cfg(not(target_arch = "x86_64"))]
    true
}

#[cfg(target_arch = "x86_64")]
fn get_cpu_brand() -> String {
    use std::arch::x86_64::__cpuid;
    
    unsafe {
        let mut brand = String::new();
        
        // Get extended function support
        let result = __cpuid(0x80000000);
        if result.eax >= 0x80000004 {
            // Get brand string (3 calls, 16 bytes each)
            for i in 0x80000002..=0x80000004 {
                let result = __cpuid(i);
                brand.push_str(&format!("{}{}{}{}", 
                    std::str::from_utf8(&result.eax.to_le_bytes()).unwrap_or(""),
                    std::str::from_utf8(&result.ebx.to_le_bytes()).unwrap_or(""),
                    std::str::from_utf8(&result.ecx.to_le_bytes()).unwrap_or(""),
                    std::str::from_utf8(&result.edx.to_le_bytes()).unwrap_or(""),
                ));
            }
        }
        
        brand.trim().to_string()
    }
}

#[cfg(not(target_arch = "x86_64"))]
fn get_cpu_brand() -> String {
    "Unknown".to_string()
}