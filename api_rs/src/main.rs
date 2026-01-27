use std::error::Error;

use serde::{Deserialize, Serialize};

use axum::{Json, Router, http::StatusCode, routing::get};

#[derive(Serialize)]
struct Message {
    message: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    // ser_des();
    let _ = run_server();
}

#[allow(dead_code)]
#[tokio::main]
async fn run_server() -> Result<(), Box<dyn Error>> {
    let addr = String::from("0.0.0.0:5000");
    let app = Router::new().route("/", get(say_hello).post(create_stuff));

    let listener = tokio::net::TcpListener::bind(addr.clone()).await.unwrap();

    println!("listening on {addr}");

    axum::serve(listener, app).await.unwrap();

    Ok(())
}

async fn create_stuff(Json(new_point): Json<Point>) -> Result<Json<serde_json::Value>, StatusCode> {
    Ok(Json(serde_json::json!({
        "message": serde_json::to_string(&new_point).unwrap()
    })))
}

async fn say_hello() -> &'static str {
    "Heyoooo"
}

#[allow(dead_code)]
fn ser_des() {
    println!("Hello, world!");

    let point = Point { x: 10, y: 20 };

    let serialized = serde_json::to_string(&point).unwrap();

    println!("serialized = {serialized}");

    let deserialized: Point = serde_json::from_str(&serialized).unwrap();

    println!("deserialized = {deserialized:?}");
}
