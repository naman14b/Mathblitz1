import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  StatusBar,
  Linking,
  Dimensions,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const TARGET_URL = "https://mathblitz1-git-main-naman14b-9105.vercel.app/";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const insets = useSafeAreaInsets();

  // Handle hardware Android back button to navigate in-app web history
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // handled
      }
      return false; // let system handle default exit
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;
    // Allow navigation within the app target domain
    if (
      url.startsWith("https://mathblitz1") ||
      url.startsWith("https://mathblitz1-git-main-naman14b-9105.vercel.app") ||
      url.includes("vercel.app") ||
      url.startsWith("about:blank") ||
      url.startsWith("data:")
    ) {
      return true;
    }

    // Open external links (e.g. mailto, tel, external docs) in external browser
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("tel:")) {
      Linking.openURL(url).catch((err) =>
        console.warn("Failed to open external URL:", err)
      );
      return false;
    }

    return true;
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFDF9"
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <View style={styles.errorIconBg}>
                <Ionicons name="cloud-offline-outline" size={48} color="#FF6B35" />
              </View>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorDescription}>
                Unable to load FunGanit. Please check your internet connection and try again.
              </Text>
              {errorMessage ? (
                <Text style={styles.errorDetails}>{errorMessage}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.8}
                onPress={handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>Retry Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.webViewWrapper}>
            <WebView
              ref={webViewRef}
              source={{ uri: TARGET_URL }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              cacheEnabled={true}
              cacheMode="LOAD_DEFAULT"
              androidLayerType="hardware"
              setSupportMultipleWindows={false}
              mixedContentMode="compatibility"
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              scalesPageToFit={true}
              overScrollMode="never"
              bounces={false}
              pullToRefreshEnabled={false}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              onLoadStart={() => {
                setHasError(false);
              }}
              onLoadEnd={() => {
                setIsLoading(false);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn("WebView error: ", nativeEvent);
                setHasError(true);
                setErrorMessage(nativeEvent.description || "Failed to load page");
                setIsLoading(false);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                if (nativeEvent.statusCode >= 400) {
                  console.warn("WebView HTTP error: ", nativeEvent.statusCode);
                }
              }}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <View style={styles.logoBadge}>
                    <Text style={styles.logoText}>⚡ FunGanit</Text>
                  </View>
                  <ActivityIndicator size="large" color="#FF6B35" style={styles.spinner} />
                  <Text style={styles.loadingSubtext}>Loading your game arena...</Text>
                </View>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  webViewWrapper: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFDF9",
  },
  loadingContainer: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: "#FFFDF9",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  logoBadge: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFFDF9",
  },
  errorCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF4ED",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    color: "#EF4444",
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 8,
    textAlign: "center",
    marginBottom: 16,
    width: "100%",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: "100%",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});