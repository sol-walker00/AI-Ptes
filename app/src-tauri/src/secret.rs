use keyring_core::{Entry, Error as KeyringError};
use thiserror::Error;

const SERVICE: &str = "desktop-ai-pet";
const API_KEY_ACCOUNT: &str = "openai-compatible-api-key";

#[derive(Debug, Error)]
pub enum SecretError {
    #[error("keychain operation failed: {0}")]
    Keyring(String),
    #[error("api key is not configured")]
    Missing,
}

#[derive(Debug, Clone)]
pub struct SecretStore;

impl SecretStore {
    pub fn save_api_key(api_key: &str) -> Result<(), SecretError> {
        Self::entry()?
            .set_password(api_key)
            .map_err(Self::map_keyring_error)
    }

    pub fn read_api_key() -> Result<String, SecretError> {
        Self::entry()?
            .get_password()
            .map_err(Self::map_keyring_error)
    }

    pub fn clear_api_key() -> Result<(), SecretError> {
        match Self::entry()?.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(error) => Err(Self::map_keyring_error(error)),
        }
    }

    pub fn mask_api_key(api_key: &str) -> String {
        if api_key.len() <= 8 {
            return "已保存 ****".to_string();
        }
        let suffix = &api_key[api_key.len() - 4..];
        format!("已保存 ****{suffix}")
    }

    fn entry() -> Result<Entry, SecretError> {
        keyring::use_native_store(false).map_err(Self::map_keyring_error)?;
        Entry::new(SERVICE, API_KEY_ACCOUNT).map_err(Self::map_keyring_error)
    }

    fn map_keyring_error(error: KeyringError) -> SecretError {
        match error {
            KeyringError::NoEntry => SecretError::Missing,
            other => SecretError::Keyring(other.to_string()),
        }
    }
}
