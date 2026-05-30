use std::sync::Mutex;

use crate::{models::AppData, storage::LocalStore};

pub struct BackendState {
    pub store: LocalStore,
    pub cache: Mutex<AppData>,
}

impl BackendState {
    pub fn load() -> Result<Self, crate::storage::StorageError> {
        let store = LocalStore::new()?;
        let cache = store.load_app_data()?;
        Ok(Self {
            store,
            cache: Mutex::new(cache),
        })
    }
}
