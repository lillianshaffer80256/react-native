'use strict';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

import { StyleSheet, Platform, ViewPropTypes } from 'react-native';

import PropTypes from 'prop-types';

import { WebView } from 'react-native-webview';

import { reduceData, getWidth, isSizeChanged, shouldUpdate } from './utils';

import { useSmartlookSensitiveRef } from 'smartlook-react-native-wrapper';

const isJson = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const AutoHeightWebView = React.memo(
  forwardRef((props, ref) => {
    const { style, onMessage, onSizeUpdated, source, initialHeight } = props;

    if (!source) {
      return null;
    }

    let webView = useSmartlookSensitiveRef(false);
    useImperativeHandle(ref, () => ({
      stopLoading: () => webView.current.stopLoading(),
      goForward: () => webView.current.goForward(),
      goBack: () => webView.current.goBack(),
      reload: () => webView.current.reload(),
      injectJavaScript: (script) => webView.current.injectJavaScript(script),
    }));

    const [size, setSize] = useState({
      height: initialHeight ?? (style && style.height ? style.height : 0),
      width: getWidth(style),
    });
    const handleMessage = (event) => {
      onMessage && onMessage(event);
      if (!event.nativeEvent) {
        return;
      }
      if (!isJson(event.nativeEvent.data)) {
        return;
      }
      let data = {};
      // Sometimes the message is invalid JSON, so we ignore that case
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch (error) {
        console.error(error);
        return;
      }
      const { height, width } = data;
      const { height: previousHeight, width: previousWidth } = size;
      isSizeChanged({ height, previousHeight, width, previousWidth }) &&
        setSize({
          height,
          width,
        });
    };

    const { currentSource, script } = reduceData(props);
    const { width, height } = size;
    useEffect(
      () =>
        onSizeUpdated &&
        onSizeUpdated({
          height,
          width,
        }),
      [width, height, onSizeUpdated]
    );

    return (
      <WebView
        {...props}
        ref={webView}
        onMessage={handleMessage}
        style={[
          styles.webView,
          {
            width,
            height,
          },
          style,
        ]}
        injectedJavaScript={script}
        source={currentSource}
      />
    );
  }),
  (prevProps, nextProps) => !shouldUpdate({ prevProps, nextProps })
);

AutoHeightWebView.propTypes = {
  onSizeUpdated: PropTypes.func,
  // add files to android/app/src/main/assets/ (depends on baseUrl) on android
  // add files to web/ (depends on baseUrl) on iOS
  files: PropTypes.arrayOf(
    PropTypes.shape({
      href: PropTypes.string,
      type: PropTypes.string,
      rel: PropTypes.string,
    })
  ),
  initialHeight: PropTypes.oneOf([PropTypes.string, PropTypes.number]),
  style: ViewPropTypes.style,
  customScript: PropTypes.string,
  customStyle: PropTypes.string,
  zoomable: PropTypes.bool,
  // webview props
  originWhitelist: PropTypes.arrayOf(PropTypes.string),
  onMessage: PropTypes.func,
  // baseUrl now contained by source
  // 'web/' by default on iOS
  // 'file:///android_asset/' by default on Android
  source: PropTypes.object,
};

let defaultProps = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  originWhitelist: ['*'],
  zoomable: true,
};

Platform.OS === 'android' &&
  Object.assign(defaultProps, {
    scalesPageToFit: false,
  });

AutoHeightWebView.defaultProps = defaultProps;

const styles = StyleSheet.create({
  webView: {
    backgroundColor: 'transparent',
  },
});

export default AutoHeightWebView;
