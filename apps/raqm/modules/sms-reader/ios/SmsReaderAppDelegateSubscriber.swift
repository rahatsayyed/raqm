import ExpoModulesCore
import UIKit

/// Registered via expo-module.config.json's apple.appDelegateSubscribers (same mechanism
/// expo-notifications uses) since the generated AppDelegate can't be edited directly.
/// Captures the Quick Action shortcut tap on both cold launch (didFinishLaunchingWithOptions)
/// and warm launch (performActionFor) into QuickAdd.pending.
public class SmsReaderAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem {
      _ = QuickAdd.handle(item)
    }
    return true
  }

  public func application(
    _ application: UIApplication,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    completionHandler(QuickAdd.handle(shortcutItem))
  }
}
