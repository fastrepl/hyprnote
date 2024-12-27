// https://github.com/tursodatabase/libsql/tree/main/libsql/examples

pub async fn exploring() {
    let db_path = "test.db".to_string();
    let sync_url = "https://localhost:50051".to_string();
    let auth_token = "test".to_string();

    let db = libsql::Builder::new_remote_replica(db_path, sync_url, auth_token)
        .build()
        .await
        .unwrap();

    let conn = db.connect().unwrap();

    let _rows = conn.query("SELECT * FROM test", ()).await.unwrap();
    // println!("{:?}", rows);
}
