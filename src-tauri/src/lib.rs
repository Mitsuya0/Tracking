mod vcam;
use std::sync::Mutex;
use tauri::State;
use vcam::VirtualCameraManager;

pub struct AppState {
    pub vcam_manager: Mutex<VirtualCameraManager>,
}

#[tauri::command]
fn start_virtual_camera(
    state: State<'_, AppState>,
    width: u32,
    height: u32,
    fps: u32,
) -> Result<String, String> {
    let mut manager = state.vcam_manager.lock().map_err(|e| e.to_string())?;
    manager.start(width, height, fps)
}

#[tauri::command]
fn stop_virtual_camera(state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state.vcam_manager.lock().map_err(|e| e.to_string())?;
    manager.stop()
}

#[tauri::command]
fn send_camera_frame(state: State<'_, AppState>, frame: Vec<u8>) -> Result<(), String> {
    let mut manager = state.vcam_manager.lock().map_err(|e| e.to_string())?;
    manager.push_frame(&frame)
}

#[tauri::command]
fn is_virtual_camera_running(state: State<'_, AppState>) -> Result<bool, String> {
    let manager = state.vcam_manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.is_running())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        vcam_manager: Mutex::new(VirtualCameraManager::new()),
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            start_virtual_camera,
            stop_virtual_camera,
            send_camera_frame,
            is_virtual_camera_running,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
