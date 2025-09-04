!macro NSIS_HOOK_POSTINSTALL
  ; Check if Visual C++ 2019 Redistributable is installed (via Windows Registry)
  ReadRegDWord $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"

  ${If} $0 == 1
    DetailPrint "Visual C++ Redistributable already installed"
    Goto vcredist_done
  ${EndIf}

  ; Install from bundled MSI if not installed
  ${If} ${FileExists} "$INSTDIR\resources\vc_redist.x64.msi"
    DetailPrint "Installing Visual C++ Redistributable..."
    ; Copy to TEMP folder and then execute installer
    CopyFiles "$INSTDIR\resources\vc_redist.x64.msi" "$TEMP\vc_redist.x64.msi"
    ExecWait 'msiexec /i "$TEMP\vc_redist.x64.msi" /passive /norestart' $0

    ; Check wether installation process exited successfully (code 0) or not
    ${If} $0 == 0
      DetailPrint "Visual C++ Redistributable installed successfully"
    ${Else}
      MessageBox MB_ICONEXCLAMATION "Visual C++ installation failed. Some features may not work."
    ${EndIf}

    ; Clean up setup files from TEMP and your installed app
    Delete "$TEMP\vc_redist.x64.msi"
    Delete "$INSTDIR\resources\vc_redist.x64.msi"
  ${EndIf}

  vcredist_done:
  
  ; Validate required DLLs are present
  DetailPrint "Validating required dependencies..."
  
  ; Check for ONNX Runtime DLL
  ${If} ${FileExists} "$INSTDIR\onnxruntime.dll"
    DetailPrint "✓ onnxruntime.dll found"
  ${Else}
    MessageBox MB_ICONEXCLAMATION "Warning: onnxruntime.dll is missing. AI features may not work."
  ${EndIf}
  
  ; Check for DirectML DLL
  ${If} ${FileExists} "$INSTDIR\DirectML.dll"
    DetailPrint "✓ DirectML.dll found"
  ${Else}
    MessageBox MB_ICONEXCLAMATION "Warning: DirectML.dll is missing. GPU acceleration may not work."
  ${EndIf}
  
  ; Check for Visual C++ runtime DLLs
  ${If} ${FileExists} "$INSTDIR\msvcp140.dll"
    DetailPrint "✓ msvcp140.dll found"
  ${Else}
    MessageBox MB_ICONEXCLAMATION "Warning: msvcp140.dll is missing. Application may not start."
  ${EndIf}
  
  ${If} ${FileExists} "$INSTDIR\vcruntime140.dll"
    DetailPrint "✓ vcruntime140.dll found"
  ${Else}
    MessageBox MB_ICONEXCLAMATION "Warning: vcruntime140.dll is missing. Application may not start."
  ${EndIf}
  
  ${If} ${FileExists} "$INSTDIR\vcruntime140_1.dll"
    DetailPrint "✓ vcruntime140_1.dll found"
  ${Else}
    DetailPrint "Note: vcruntime140_1.dll not found (may not be required on this system)"
  ${EndIf}
  
  ${If} ${FileExists} "$INSTDIR\msvcp140_1.dll"
    DetailPrint "✓ msvcp140_1.dll found"
  ${Else}
    DetailPrint "Note: msvcp140_1.dll not found (may not be required on this system)"
  ${EndIf}
  
  ; Set ORT_DYLIB_PATH environment variable for the application
  ; Use relative path to avoid hardcoded installation directory issues
  WriteRegStr HKLM "SYSTEM\CurrentControlSet\Control\Session Manager\Environment" "ORT_DYLIB_PATH" "$INSTDIR"
  
  ; Force environment variable refresh
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
  
  DetailPrint "Installation validation completed"
  
!macroend
