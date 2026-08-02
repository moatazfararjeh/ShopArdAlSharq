//
// Use this file to import your target's public headers that you would like to expose to Swift.
//

// Expose RCTSetFatalHandler so we can override the default abort() behavior
// in production builds. Without this, any unhandled JS exception calls abort()
// and crashes the app (Guideline 2.1a — App Completeness).
#import <React/RCTAssert.h>
