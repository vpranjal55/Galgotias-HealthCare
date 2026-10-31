'use strict';
/**
 * Expo config plugin: Android Health Connect (react-native-health-connect).
 * Runs only at prebuild / EAS build time — it is inert for `expo start` and the web export.
 *
 *  - declares read permissions (steps, distance, active calories, heart rate)
 *  - adds the Health Connect package <queries> entry
 *  - adds the permission-rationale intent filter + Android 14 usage activity-alias
 *  - installs the permission delegate in MainActivity
 *  - raises minSdkVersion to 26 (Health Connect requirement)
 */
const { withAndroidManifest, withMainActivity, withGradleProperties, AndroidConfig } = require('expo/config-plugins');

const PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_HEART_RATE',
];

function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    PERMISSIONS.forEach((name) => {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    });

    manifest.queries = manifest.queries || [];
    const hasQuery = manifest.queries.some((q) => (q.package || []).some((p) => p.$['android:name'] === 'com.google.android.apps.healthdata'));
    if (!hasQuery) {
      manifest.queries.push({ package: [{ $: { 'android:name': 'com.google.android.apps.healthdata' } }] });
    }

    const app = manifest.application[0];
    const main = (app.activity || []).find((a) => a.$['android:name'] === '.MainActivity');
    if (main) {
      main['intent-filter'] = main['intent-filter'] || [];
      const has = main['intent-filter'].some((f) => (f.action || []).some((a) => a.$['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'));
      if (!has) {
        main['intent-filter'].push({ action: [{ $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } }] });
      }
    }

    app['activity-alias'] = app['activity-alias'] || [];
    if (!app['activity-alias'].some((a) => a.$['android:name'] === 'ViewPermissionUsageActivity')) {
      app['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return cfg;
  });
}

function withDelegate(config) {
  return withMainActivity(config, (cfg) => {
    const mod = cfg.modResults;
    if (mod.language !== 'kt') {
      console.warn('[withHealthConnect] MainActivity is not Kotlin; add HealthConnectPermissionDelegate.setPermissionDelegate(this) manually.');
      return cfg;
    }
    const importLine = 'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
    if (!mod.contents.includes(importLine)) {
      mod.contents = mod.contents.replace(/(package [^\n]+\n)/, `$1\n${importLine}\n`);
    }
    const call = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';
    if (!mod.contents.includes(call)) {
      mod.contents = mod.contents.replace(/(super\.onCreate\([^)]*\)\s*\n)/, `$1    ${call}\n`);
      if (!mod.contents.includes(call)) {
        console.warn('[withHealthConnect] Could not find super.onCreate in MainActivity; add the permission delegate call manually.');
      }
    }
    return cfg;
  });
}

function withMinSdk(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === 'android.minSdkVersion');
    if (existing) {
      if (parseInt(existing.value, 10) < 26) existing.value = '26';
    } else {
      props.push({ type: 'property', key: 'android.minSdkVersion', value: '26' });
    }
    return cfg;
  });
}

module.exports = function withHealthConnect(config) {
  return withMinSdk(withDelegate(withManifest(config)));
};
