use std::panic::AssertUnwindSafe;

use objc2::{msg_send, rc::Retained, runtime::Bool};
use objc2_contacts::{CNContact, CNContactStore, CNEntityType, CNPhoneNumber};
use objc2_foundation::{NSArray, NSError, NSString};

use crate::model::{ParticipantContact, ParticipantScheduleStatus};

pub fn resolve_participant_contact(
    participant: &objc2_event_kit::EKParticipant,
    url: Option<&str>,
) -> (Option<String>, Option<ParticipantContact>) {
    if let Some(contact) = try_fetch_contact(participant) {
        let email = contact.email_addresses.first().cloned();
        return (email, Some(contact));
    }

    let email = parse_email_from_url(url);
    (email, None)
}

fn try_fetch_contact(participant: &objc2_event_kit::EKParticipant) -> Option<ParticipantContact> {
    if !has_contacts_access() {
        return None;
    }

    let participant = AssertUnwindSafe(participant);
    let predicate: Retained<objc2_foundation::NSPredicate> =
        match unsafe { objc2::exception::catch(|| participant.contactPredicate()) } {
            Ok(p) => p,
            Err(_) => return None,
        };

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
            unifiedContactsMatchingPredicate: &*predicate,
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

    Some(ParticipantContact {
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

fn has_contacts_access() -> bool {
    let status =
        unsafe { CNContactStore::authorizationStatusForEntityType(CNEntityType::Contacts) };
    status.0 == 3 // CNAuthorizationStatus::Authorized
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

fn parse_email_from_url(url: Option<&str>) -> Option<String> {
    let url = url?;
    if url.starts_with("mailto:") {
        Some(url.trim_start_matches("mailto:").to_string())
    } else {
        None
    }
}

pub fn safe_participant_schedule_status(
    participant: &objc2_event_kit::EKParticipant,
) -> Option<ParticipantScheduleStatus> {
    let participant = AssertUnwindSafe(participant);
    let result = objc2::exception::catch(|| unsafe {
        let raw: objc2_foundation::NSInteger = msg_send![*participant, participantScheduleStatus];
        raw
    });

    match result {
        Ok(raw) => transform_participant_schedule_status(raw),
        Err(_) => None,
    }
}

fn transform_participant_schedule_status(
    status: objc2_foundation::NSInteger,
) -> Option<ParticipantScheduleStatus> {
    match status {
        0 => Some(ParticipantScheduleStatus::None),
        1 => Some(ParticipantScheduleStatus::Pending),
        2 => Some(ParticipantScheduleStatus::Sent),
        3 => Some(ParticipantScheduleStatus::Delivered),
        4 => Some(ParticipantScheduleStatus::RecipientNotRecognized),
        5 => Some(ParticipantScheduleStatus::NoPrivileges),
        6 => Some(ParticipantScheduleStatus::DeliveryFailed),
        7 => Some(ParticipantScheduleStatus::CannotDeliver),
        _ => None,
    }
}
