package expo.modules.smsreader

import android.app.ActivityManager
import android.content.Context

object AppProcess {
  /**
   * When our own process is already alive and in the foreground, Android lets a plain
   * (non-foreground) Service start with no restrictions — no notification required. Only
   * the killed/backgrounded case needs the foreground-service promotion (and therefore
   * HeadlessSmsTaskService's silent notification). Checking our OWN process's importance
   * this way is unrestricted (the getRunningAppProcesses() restrictions target seeing
   * OTHER apps' info).
   */
  fun isForeground(context: Context): Boolean {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
    val processes = am.runningAppProcesses ?: return false
    return processes.any {
      it.processName == context.packageName &&
        it.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    }
  }
}
