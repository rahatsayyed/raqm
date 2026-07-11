import { KeyboardAwareScrollView as RNKeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { cssInterop } from "nativewind";

// Third-party components aren't styled by NativeWind's babel transform
// automatically — cssInterop registers className/contentContainerClassName
// so this behaves like a first-class NativeWind component everywhere it's used.
cssInterop(RNKeyboardAwareScrollView, {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
});

export const KeyboardAwareScrollView = RNKeyboardAwareScrollView;
