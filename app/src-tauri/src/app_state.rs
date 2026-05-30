use std::sync::Mutex;

use crate::{models::AppData, storage::LocalStore};

pub struct CachedAppData {
    pub data: AppData,
    pub revision: u64,
}

pub struct BackendState {
    pub store: LocalStore,
    pub cache: Mutex<CachedAppData>,
}

impl BackendState {
    pub fn load() -> Result<Self, crate::storage::StorageError> {
        let store = LocalStore::new()?;
        let data = store.load_app_data()?;
        Ok(Self {
            store,
            cache: Mutex::new(CachedAppData { data, revision: 0 }),
        })
    }
}
