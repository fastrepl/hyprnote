//! X11 window placement. gpui 0.2.2 creates the X window at the requested
//! origin but never asks the window manager to honour it (no `PPosition`
//! hint), so the manager places the window itself and a restored
//! `.window-state.json` position is lost. Tauri's GTK window moves to its
//! saved origin; the shell does the same with a `ConfigureWindow` on the
//! mapped window, found through the `_NET_WM_PID` gpui stamps on it.

use std::time::Duration;

use x11rb::connection::Connection;
use x11rb::properties::WmHints;
use x11rb::protocol::xproto::{AtomEnum, ConfigureWindowAux, ConnectionExt, MapState, Window};

/// Moves this process's mapped top-level window of `width` × `height` to
/// (`x`, `y`) once the window manager has shown it. Runs off the UI thread
/// and gives up quietly when there is no X server or no such window.
pub fn move_window_when_mapped(width: u32, height: u32, x: i32, y: i32) {
    std::thread::Builder::new()
        .name("x11-window-move".into())
        .spawn(move || {
            for _ in 0..40 {
                match try_move(width, height, x, y) {
                    Ok(true) => {
                        tracing::debug!(x, y, "moved the main window to its saved origin");
                        return;
                    }
                    Ok(false) => std::thread::sleep(Duration::from_millis(50)),
                    Err(error) => {
                        tracing::debug!(%error, "x11 window move unavailable");
                        return;
                    }
                }
            }
            tracing::debug!("the main window did not map in time to be moved");
        })
        .ok();
}

fn try_move(width: u32, height: u32, x: i32, y: i32) -> anyhow::Result<bool> {
    let (conn, screen) = x11rb::connect(None)?;
    let root = conn.setup().roots[screen].root;
    let pid_atom = conn.intern_atom(false, b"_NET_WM_PID")?.reply()?.atom;
    let pid = std::process::id();
    let Some(window) = find_window(&conn, root, pid_atom, pid, width, height)? else {
        return Ok(false);
    };
    conn.configure_window(window, &ConfigureWindowAux::new().x(x).y(y))?;
    conn.flush()?;
    Ok(true)
}

/// `requestUserAttention(Informational)` as GTK does it: the `WM_HINTS`
/// urgency flag on this process's mapped `width` × `height` window, which
/// the window manager shows as a demanding taskbar entry; `false` clears it
/// again once the window is active. Runs off the UI thread.
pub fn set_urgent(width: u32, height: u32, urgent: bool) {
    std::thread::Builder::new()
        .name("x11-attention".into())
        .spawn(move || {
            if let Err(error) = try_set_urgent(width, height, urgent) {
                tracing::debug!(%error, urgent, "x11 urgency hint unavailable");
            }
        })
        .ok();
}

fn try_set_urgent(width: u32, height: u32, urgent: bool) -> anyhow::Result<()> {
    let (conn, screen) = x11rb::connect(None)?;
    let root = conn.setup().roots[screen].root;
    let pid_atom = conn.intern_atom(false, b"_NET_WM_PID")?.reply()?.atom;
    let pid = std::process::id();
    let Some(window) = find_window(&conn, root, pid_atom, pid, width, height)? else {
        anyhow::bail!("main window not found");
    };
    let mut hints = WmHints::get(&conn, window)?.reply()?.unwrap_or_default();
    if hints.urgent == urgent {
        return Ok(());
    }
    hints.urgent = urgent;
    hints.set(&conn, window)?;
    conn.flush()?;
    Ok(())
}

fn find_window(
    conn: &impl Connection,
    window: Window,
    pid_atom: u32,
    pid: u32,
    width: u32,
    height: u32,
) -> anyhow::Result<Option<Window>> {
    let owner = conn
        .get_property(false, window, pid_atom, AtomEnum::CARDINAL, 0, 1)?
        .reply()?
        .value32()
        .and_then(|mut values| values.next());
    if owner == Some(pid) {
        let geometry = conn.get_geometry(window)?.reply()?;
        let attributes = conn.get_window_attributes(window)?.reply()?;
        let fits = u32::from(geometry.width).abs_diff(width) <= 2
            && u32::from(geometry.height).abs_diff(height) <= 2;
        if fits && attributes.map_state == MapState::VIEWABLE {
            return Ok(Some(window));
        }
    }
    for child in conn.query_tree(window)?.reply()?.children {
        if let Some(found) = find_window(conn, child, pid_atom, pid, width, height)? {
            return Ok(Some(found));
        }
    }
    Ok(None)
}

/// `clipboardData.getData("text/html")`: the `text/html` target of the
/// CLIPBOARD selection, which gpui's clipboard (text and images) does not
/// read. `None` when the owner offers no HTML or does not answer in time.
pub fn clipboard_html() -> Option<String> {
    use std::sync::{Mutex, OnceLock};
    use x11_clipboard::Clipboard;
    static CLIPBOARD: OnceLock<Option<Mutex<Clipboard>>> = OnceLock::new();
    let clipboard = CLIPBOARD
        .get_or_init(|| match Clipboard::new() {
            Ok(clipboard) => Some(Mutex::new(clipboard)),
            Err(error) => {
                tracing::debug!(%error, "x11 clipboard unavailable");
                None
            }
        })
        .as_ref()?;
    let clipboard = clipboard.lock().ok()?;
    let target = clipboard.getter.get_atom("text/html").ok()?;
    let bytes = clipboard
        .load(
            clipboard.getter.atoms.clipboard,
            target,
            clipboard.getter.atoms.property,
            Duration::from_millis(250),
        )
        .ok()?;
    if bytes.is_empty() {
        return None;
    }
    // Some owners hand out UTF-16 with a byte-order mark.
    let text = match bytes.as_slice() {
        [0xff, 0xfe, rest @ ..] => String::from_utf16_lossy(
            &rest
                .chunks_exact(2)
                .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
                .collect::<Vec<_>>(),
        ),
        [0xfe, 0xff, rest @ ..] => String::from_utf16_lossy(
            &rest
                .chunks_exact(2)
                .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
                .collect::<Vec<_>>(),
        ),
        _ => String::from_utf8_lossy(&bytes).into_owned(),
    };
    let text = text.trim_end_matches('\0').to_string();
    (!text.trim().is_empty()).then_some(text)
}
