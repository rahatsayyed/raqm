package expo.modules.smsreader

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class VoiceTileService : TileService() {

  override fun onTileAdded() {
    setActiveState()
  }

  override fun onStartListening() {
    setActiveState()
  }

  override fun onClick() {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        val pendingIntent = QuickAdd.mainActivityPendingIntent(
          context = applicationContext,
          requestCode = REQUEST_CODE,
          quickAdd = true,
          startVoice = true,
        ) ?: return
        startActivityAndCollapse(pendingIntent)
      } else {
        val intent = QuickAdd.mainActivityIntent(applicationContext, quickAdd = true, startVoice = true) ?: return
        @Suppress("DEPRECATION")
        startActivityAndCollapse(intent)
      }
    } catch (e: Exception) {
      DiagnosticLog.write(applicationContext, "error.caught", "VoiceTileService: ${e.message}")
    }
  }

  private fun setActiveState() {
    try {
      qsTile?.apply {
        state = Tile.STATE_ACTIVE
        label = "Voice cash spend"
        updateTile()
      }
    } catch (e: Exception) {
      DiagnosticLog.write(applicationContext, "error.caught", "VoiceTileService.setActiveState: ${e.message}")
    }
  }

  private companion object {
    const val REQUEST_CODE = 8102
  }
}
