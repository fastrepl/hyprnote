package so.anarlog.mobilebridge

import android.content.Context

internal object AndroidTls {
  init {
    System.loadLibrary("mobile_bridge")
  }

  external fun initialize(context: Context)
}
