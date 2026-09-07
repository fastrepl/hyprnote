use jni::{JNIEnv, objects::JObject};

#[allow(unsafe_code, reason = "JNI requires a stable exported entry point.")]
#[unsafe(no_mangle)]
pub extern "system" fn Java_so_anarlog_mobilebridge_AndroidTls_initialize(
    mut env: JNIEnv,
    _object: JObject,
    context: JObject,
) {
    if let Err(error) = rustls_platform_verifier::android::init_with_env(&mut env, context) {
        let _ = env.throw_new(
            "java/lang/IllegalStateException",
            format!("Could not initialize Android certificate verification: {error}"),
        );
    }
}
