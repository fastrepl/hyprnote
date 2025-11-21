use swift_rs::{swift, SRString};

swift!(fn notch_show_info(title: SRString, description: SRString, icon_name: SRString));

swift!(fn notch_hide());

swift!(fn notch_compact());

pub fn show_notch(title: &str, description: &str, icon_name: &str) {
    unsafe {
        notch_show_info(
            SRString::from(title),
            SRString::from(description),
            SRString::from(icon_name),
        );
    }
}

pub fn hide_notch() {
    unsafe {
        notch_hide();
    }
}

pub fn compact_notch() {
    unsafe {
        notch_compact();
    }
}

#[cfg(test)]
mod tests {}
