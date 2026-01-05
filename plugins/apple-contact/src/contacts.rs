use objc2::{msg_send, rc::Retained, runtime::Bool};
use objc2_contacts::{
    CNAuthorizationStatus, CNContact, CNContactStore, CNEntityType, CNPhoneNumber,
};
use objc2_foundation::{NSArray, NSError, NSInteger, NSPredicate, NSString};

use crate::types::{Contact, Human, ImportResult, Organization};

const CN_CONTACT_TYPE_ORGANIZATION: NSInteger = 1;

pub fn has_contacts_access() -> bool {
    let status =
        unsafe { CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts) };
    status == CNAuthorizationStatus::Authorized
}

pub fn fetch_contact_with_predicate(predicate: &NSPredicate) -> Option<Contact> {
    if !has_contacts_access() {
        return None;
    }

    let contact_store = unsafe { CNContactStore::new() };

    let keys_to_fetch: Retained<NSArray<NSString>> = NSArray::from_slice(&[
        &*NSString::from_str("identifier"),
        &*NSString::from_str("givenName"),
        &*NSString::from_str("familyName"),
        &*NSString::from_str("middleName"),
        &*NSString::from_str("organizationName"),
        &*NSString::from_str("jobTitle"),
        &*NSString::from_str("emailAddresses"),
        &*NSString::from_str("phoneNumbers"),
        &*NSString::from_str("urlAddresses"),
        &*NSString::from_str("imageDataAvailable"),
    ]);

    let contacts: Option<Retained<NSArray<CNContact>>> = unsafe {
        msg_send![
            &*contact_store,
            unifiedContactsMatchingPredicate: predicate,
            keysToFetch: &*keys_to_fetch,
            error: std::ptr::null_mut::<*mut NSError>()
        ]
    };

    let contacts = contacts?;
    let contact = contacts.iter().next()?;

    let identifier = unsafe {
        let id: Retained<NSString> = msg_send![&*contact, identifier];
        id.to_string()
    };

    let given_name = get_optional_string(&contact, "givenName");
    let family_name = get_optional_string(&contact, "familyName");
    let middle_name = get_optional_string(&contact, "middleName");
    let organization_name = get_optional_string(&contact, "organizationName");
    let job_title = get_optional_string(&contact, "jobTitle");

    let email_addresses = extract_labeled_string_values(&contact, "emailAddresses");
    let phone_numbers = extract_phone_numbers(&contact);
    let url_addresses = extract_labeled_string_values(&contact, "urlAddresses");

    let image_available: bool = unsafe {
        let b: Bool = msg_send![&*contact, imageDataAvailable];
        b.as_bool()
    };

    Some(Contact {
        identifier,
        given_name,
        family_name,
        middle_name,
        organization_name,
        job_title,
        email_addresses,
        phone_numbers,
        url_addresses,
        image_available,
    })
}

fn get_optional_string(contact: &Retained<CNContact>, key: &str) -> Option<String> {
    unsafe {
        let value: Option<Retained<NSString>> =
            msg_send![&**contact, valueForKey: &*NSString::from_str(key)];
        value.filter(|s| !s.is_empty()).map(|s| s.to_string())
    }
}

fn extract_labeled_string_values(contact: &Retained<CNContact>, key: &str) -> Vec<String> {
    unsafe {
        let labeled_values: Option<Retained<NSArray>> =
            msg_send![&**contact, valueForKey: &*NSString::from_str(key)];
        labeled_values
            .map(|arr| {
                arr.iter()
                    .filter_map(|lv| {
                        let value: Option<Retained<NSString>> = msg_send![&*lv, value];
                        value.map(|s| s.to_string())
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}

fn extract_phone_numbers(contact: &Retained<CNContact>) -> Vec<String> {
    unsafe {
        let labeled_values: Option<Retained<NSArray>> =
            msg_send![&**contact, valueForKey: &*NSString::from_str("phoneNumbers")];
        labeled_values
            .map(|arr| {
                arr.iter()
                    .filter_map(|lv| {
                        let phone: Option<Retained<CNPhoneNumber>> = msg_send![&*lv, value];
                        phone.and_then(|p| {
                            let digits: Option<Retained<NSString>> = msg_send![&*p, stringValue];
                            digits.map(|s| s.to_string())
                        })
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}

pub fn import_contacts() -> Option<ImportResult> {
    if !has_contacts_access() {
        return None;
    }

    let contact_store = unsafe { CNContactStore::new() };

    let keys_to_fetch: Retained<NSArray<NSString>> = NSArray::from_slice(&[
        &*NSString::from_str("identifier"),
        &*NSString::from_str("contactType"),
        &*NSString::from_str("givenName"),
        &*NSString::from_str("familyName"),
        &*NSString::from_str("middleName"),
        &*NSString::from_str("organizationName"),
        &*NSString::from_str("jobTitle"),
        &*NSString::from_str("emailAddresses"),
        &*NSString::from_str("phoneNumbers"),
        &*NSString::from_str("urlAddresses"),
        &*NSString::from_str("imageDataAvailable"),
    ]);

    let predicate = unsafe {
        let pred: Retained<NSPredicate> = msg_send![objc2::class!(CNContact), predicateForContactsInContainerWithIdentifier: std::ptr::null::<NSString>()];
        pred
    };

    let contacts: Option<Retained<NSArray<CNContact>>> = unsafe {
        msg_send![
            &*contact_store,
            unifiedContactsMatchingPredicate: &*predicate,
            keysToFetch: &*keys_to_fetch,
            error: std::ptr::null_mut::<*mut NSError>()
        ]
    };

    let contacts = contacts?;

    let mut humans = Vec::new();
    let mut organizations = Vec::new();

    for contact in contacts.iter() {
        let contact_type: NSInteger = unsafe { msg_send![&*contact, contactType] };

        let identifier = unsafe {
            let id: Retained<NSString> = msg_send![&*contact, identifier];
            id.to_string()
        };

        let email_addresses = extract_labeled_string_values(&contact, "emailAddresses");
        let phone_numbers = extract_phone_numbers_from_ref(&contact);
        let url_addresses = extract_labeled_string_values(&contact, "urlAddresses");

        let image_available: bool = unsafe {
            let b: Bool = msg_send![&*contact, imageDataAvailable];
            b.as_bool()
        };

        if contact_type == CN_CONTACT_TYPE_ORGANIZATION {
            let name = get_optional_string_from_ref(&contact, "organizationName");
            if let Some(name) = name {
                organizations.push(Organization {
                    identifier,
                    name,
                    email_addresses,
                    phone_numbers,
                    url_addresses,
                    image_available,
                });
            }
        } else {
            humans.push(Human {
                identifier,
                given_name: get_optional_string_from_ref(&contact, "givenName"),
                family_name: get_optional_string_from_ref(&contact, "familyName"),
                middle_name: get_optional_string_from_ref(&contact, "middleName"),
                organization_name: get_optional_string_from_ref(&contact, "organizationName"),
                job_title: get_optional_string_from_ref(&contact, "jobTitle"),
                email_addresses,
                phone_numbers,
                url_addresses,
                image_available,
            });
        }
    }

    Some(ImportResult {
        humans,
        organizations,
    })
}

fn get_optional_string_from_ref(contact: &CNContact, key: &str) -> Option<String> {
    unsafe {
        let value: Option<Retained<NSString>> =
            msg_send![contact, valueForKey: &*NSString::from_str(key)];
        value.filter(|s| !s.is_empty()).map(|s| s.to_string())
    }
}

fn extract_phone_numbers_from_ref(contact: &CNContact) -> Vec<String> {
    unsafe {
        let labeled_values: Option<Retained<NSArray>> =
            msg_send![contact, valueForKey: &*NSString::from_str("phoneNumbers")];
        labeled_values
            .map(|arr| {
                arr.iter()
                    .filter_map(|lv| {
                        let phone: Option<Retained<CNPhoneNumber>> = msg_send![&*lv, value];
                        phone.and_then(|p| {
                            let digits: Option<Retained<NSString>> = msg_send![&*p, stringValue];
                            digits.map(|s| s.to_string())
                        })
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}
