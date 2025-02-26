#[derive(Debug, Clone)]
pub struct Vault {
    service: String,
}

#[derive(Debug, strum::AsRefStr)]
pub enum Key {
    #[allow(dead_code)]
    #[strum(serialize = "remote_database")]
    RemoteDatabase,
    #[allow(dead_code)]
    #[strum(serialize = "remote_server")]
    RemoteServer,
}

impl Vault {
    pub fn new(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
        }
    }

    pub fn get(&self, key: Key) -> Result<String, keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        entry.get_password()
    }

    pub fn set(&self, key: Key, value: impl AsRef<str>) -> Result<(), keyring::Error> {
        let entry = keyring::Entry::new(&self.service, key.as_ref()).unwrap();
        entry.set_password(value.as_ref())
    }
}
