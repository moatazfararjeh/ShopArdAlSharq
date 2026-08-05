internal import Expo
import React
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    // ── Force RTL at the native iOS level ─────────────────────────────────────
    // This runs before React Native starts, so I18nManager.isRTL is true
    // from the very first launch — no UserDefaults persistence or app restart needed.
    UserDefaults.standard.set(true,  forKey: "RCTI18nUtil_AllowRTL")
    UserDefaults.standard.set(true,  forKey: "RCTI18nUtil_ForceRTL")
    UserDefaults.standard.synchronize()
    UIView.appearance().semanticContentAttribute = .forceRightToLeft

    // ── Override the default fatal JS-error handler ───────────────────────────
    // In production builds React Native calls abort() for any unhandled JS
    // exception, which triggers an EXC_CRASH and fails App Review (2.1a).
    // Setting a custom handler lets the JS ErrorBoundary display a friendly
    // error screen instead of killing the process.
    RCTSetFatalHandler { error in
      guard let error = error else { return }
      NSLog("[FoodBox] JS fatal error (non-crashing): %@", error.localizedDescription)
      // Intentionally do NOT call abort() — the React ErrorBoundary handles UI.
    }

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
        ?? URL(string: "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
