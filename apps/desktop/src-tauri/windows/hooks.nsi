!macro NSIS_HOOK_PREINSTALL
  # Add any pre-installation tasks here
!macroend

!macro NSIS_HOOK_POSTINSTALL
  # Add any post-installation tasks here
  WriteRegStr HKCU "Software\Hyprnote" "InstallDate" "${__DATE__} ${__TIME__}"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  # Add any pre-uninstallation tasks here
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  # Add any post-uninstallation tasks here
  DeleteRegKey HKCU "Software\Hyprnote"
!macroend 