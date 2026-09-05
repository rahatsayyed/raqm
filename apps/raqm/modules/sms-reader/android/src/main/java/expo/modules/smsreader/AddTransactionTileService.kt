package expo.modules.smsreader

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * A notification-shade tile that opens Raqm straight to the quick-add screen. Static label
 * and no live content by design (see the design spec) — nothing to poll, so the tile costs
 * nothing while it sits in the shade.
 *
 * Android does not let an app add its own tile to the active set; the user adds it via the
 * system's "Edit tiles" panel. That is a documented non-goal, not a bug.
 *
 * Nothing here may throw: a TileService crash takes the system shade's tile down with it.
 */
class AddTransactionTileService : TileService() {

  override fun onTileAdded() {
    setActiveState()
  }

  override fun onStartListening() {
    setActiveState()
  }

  override fun onClick() {
    val pendingIntent = QuickAdd.mainActivityPendingIntent(
      context = applicationContext,
      requestCode = REQUEST_CODE,
      quickAdd = true,
    ) ?: return

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        // API 34+: the non-deprecated form, which takes a PendingIntent.
        startActivityAndCollapse(pendingIntent)
      } else {
        @Suppress("DEPRECATION")
        startActivityAndCollapse(
          applicationContext.packageManager
            .getLaunchIntentForPackage(applicationContext.packageName)
            ?.apply {
              addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)
              putExtra(QuickAdd.EXTRA_OPEN_QUICK_ADD, true)
            } ?: return
        )
      }
    } catch (e: Exception) {
      DiagnosticLog.write(applicationContext, "error.caught", "AddTransactionTileService: ${e.message}")
    }
  }

  private fun setActiveState() {
    try {
      qsTile?.apply {
        state = Tile.STATE_ACTIVE
        label = "Add Transaction"
        updateTile()
      }
    } catch (e: Exception) {
      // Tile detached mid-update — nothing to do, and it must never crash the shade.
    }
  }

  private companion object {
    const val REQUEST_CODE = 8101
  }
}
