//! Native file and folder choosers. The Tauri app's dialogs are GTK's — the
//! dialog plugin (rfd) and WebKitGTK's `<input type="file">` both open a
//! `GtkFileChooserDialog` with Cancel / Open — so the shell opens the same
//! dialog on its GTK thread. gpui's own prompt goes through the XDG portal
//! over zbus, which needs a portal and a tokio context this process's UI
//! thread has neither of.

use std::path::PathBuf;

/// `filters: [{ name, extensions }]` of the dialog plugin, or an `accept`
/// list of MIME patterns for a file input (`image/*`).
#[derive(Debug, Clone)]
pub enum Filter {
    Extensions {
        name: &'static str,
        extensions: &'static [&'static str],
    },
    Mime(&'static str),
}

/// What the dialog picks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Pick {
    File,
    Files,
    Folder,
}

pub struct Options {
    pub title: String,
    pub pick: Pick,
    /// `defaultPath`: the folder the dialog opens in.
    pub start_dir: Option<PathBuf>,
    pub filters: Vec<Filter>,
}

/// Opens the chooser and resolves with the chosen paths, `None` when the
/// dialog is cancelled or cannot be shown.
pub fn pick(
    cx: &mut gpui::App,
    options: Options,
) -> impl std::future::Future<Output = Option<Vec<PathBuf>>> + use<> {
    let (sender, receiver) = tokio::sync::oneshot::channel::<Option<Vec<PathBuf>>>();
    platform::open(cx, options, sender);
    async move { receiver.await.ok().flatten() }
}

#[cfg(target_os = "linux")]
mod platform {
    use super::{Filter, Options, Pick};
    use gtk::prelude::*;
    use std::cell::Cell;
    use std::path::PathBuf;
    use std::rc::Rc;
    use tokio::sync::oneshot::Sender;

    pub fn open(_cx: &mut gpui::App, options: Options, sender: Sender<Option<Vec<PathBuf>>>) {
        if !crate::gtk_loop::ensure_running() {
            let _ = sender.send(None);
            return;
        }
        crate::gtk_loop::invoke(move || {
            let action = match options.pick {
                Pick::Folder => gtk::FileChooserAction::SelectFolder,
                Pick::File | Pick::Files => gtk::FileChooserAction::Open,
            };
            // rfd's GTK dialog: Cancel and Open, no parent window.
            let dialog = gtk::FileChooserDialog::with_buttons::<gtk::Window>(
                Some(options.title.as_str()),
                None,
                action,
                &[
                    ("Cancel", gtk::ResponseType::Cancel),
                    ("Open", gtk::ResponseType::Accept),
                ],
            );
            dialog.set_select_multiple(options.pick == Pick::Files);
            if let Some(start) = options.start_dir.as_deref() {
                dialog.set_current_folder(start);
            }
            for filter in &options.filters {
                let gtk_filter = gtk::FileFilter::new();
                match filter {
                    Filter::Extensions { name, extensions } => {
                        gtk_filter.set_name(Some(name));
                        for extension in extensions.iter() {
                            gtk_filter.add_pattern(&format!("*.{extension}"));
                        }
                    }
                    Filter::Mime(mime) => {
                        gtk_filter.add_mime_type(mime);
                    }
                }
                dialog.add_filter(gtk_filter);
            }
            let sender = Rc::new(Cell::new(Some(sender)));
            dialog.connect_response(move |dialog, response| {
                let paths = (response == gtk::ResponseType::Accept).then(|| dialog.filenames());
                if let Some(sender) = sender.take() {
                    let _ = sender.send(paths.filter(|paths| !paths.is_empty()));
                }
                dialog.close();
            });
            dialog.show();
        });
    }
}

#[cfg(not(target_os = "linux"))]
mod platform {
    use super::{Options, Pick};
    use std::path::PathBuf;
    use tokio::sync::oneshot::Sender;

    /// gpui's prompt is the platform's own dialog on macOS and Windows.
    pub fn open(cx: &mut gpui::App, options: Options, sender: Sender<Option<Vec<PathBuf>>>) {
        let picker = cx.prompt_for_paths(gpui::PathPromptOptions {
            files: options.pick != Pick::Folder,
            directories: options.pick == Pick::Folder,
            multiple: options.pick == Pick::Files,
            prompt: Some(options.title.into()),
        });
        cx.spawn(async move |_| {
            let paths = match picker.await {
                Ok(Ok(paths)) => paths,
                _ => None,
            };
            let _ = sender.send(paths);
        })
        .detach();
    }
}
