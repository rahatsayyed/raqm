import ExpoModulesCore

public class SmsReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmsReader")

    OnCreate {
      QuickAdd.registerShortcut()
    }

    // Reads (and clears) the pending quick-add extra captured by
    // SmsReaderAppDelegateSubscriber. Mirrors the Android module's consumeLaunchDeepLink.
    Function("consumeLaunchDeepLink") { () -> [String: Any?]? in
      guard let pending = QuickAdd.pending else { return nil }
      QuickAdd.pending = nil
      return [
        "openQuickAdd": pending.openQuickAdd,
        "openTransaction": pending.openTransaction,
      ]
    }
  }
}
