const { spawnSync } = require("child_process");
const { generateCLDRData } = require("./tools/precompile.js");
const { glob } = require("glob");
const fs = require("fs");
const path = require("path");

let config = {
  packagerConfig: {
    asar: true,
    appBundleId: "keyboardio.chrysalis",
    darwinDarkModeSupport: "true",
    icon: "build/icon",
    name: "Chrysalis",
    extraResource: ["static", "NEWS.md", "build/app-update.yml"],
    osxUniversal: {
      x64ArchFiles: "*",
    },
    osxSign: {
      "pre-auto-entitlements": false,
      "gatekeeper-assess": false,
      identity: "Developer ID Application: Keyboard.io, Inc. (8AUZGMT2H5)",
      entitlements: "./build/entitlements",
      // optionsForFile: (filePath) => {
      // Here, we keep it simple and return a single entitlements.plist file.
      // You can use this callback to map different sets of entitlements
      // to specific files in your packaged app.
      // return { entitlements: './build/entitlements.mac.inherit.plist' }
      // }
    },
    osxNotarize: {
      tool: "notarytool",
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    },
    packageManager: "yarn",
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        certificateFile: "./cert.pfx",
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
    },
    {
      name: "@reforged/maker-appimage",
      config: {
        options: {
          // Package name.
          // name: "example-app",
          // Executable name.
          bin: "Chrysalis",
          // Human-friendly name of the application.
          // productName: "Example Electron Application",
          // `GenericName` in generated `.desktop` file.
          // genericName: "Example application",
          // Path to application's icon.
          icon: "build/icon.png",
          // `Categories` in generated `.desktop` file.
          categories: ["Utility"],
          // Actions of generated `.desktop` file.
          // actions: {
          //  new_window: {
          //    Name: "Launch in new window!",
          //    Icon: "/path/to/new-window.png",
          //    Exec: "example-app --new-window"
          //  }
          //},
          // Desktop file to be used instead of the configuration above.
          // desktopFile: "/path/to/example-app.desktop",
          // Release of `AppImage/AppImageKit`, either number or "continuous".
          // AppImageKitRelease: "continuous"
        },
      },
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "keyboardio",
          name: "Chrysalis",
        },
        draft: true,
      },
    },
  ],

  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        devContentSecurityPolicy: `default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:`,
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/renderer/index.html",
              js: "./src/renderer/index.js",
              name: "main_window",
              preload: {
                js: "./src/preload.js",
              },
            },
          ],
        },
      },
    },
  ],
  hooks: {
    generateAssets: async (forgeConfig, platform, arch) => {
      generateCLDRData();
    },
    readPackageJson: async (forgeConfig, packageJson) => {
      // only copy deps if there isn't any
      if (Object.keys(packageJson.dependencies).length === 0) {
        const originalPackageJson = await fs.readJson(
          path.resolve(__dirname, "package.json"),
        );
        const webpackConfigJs = require("./webpack.renderer.config.js");
        Object.keys(webpackConfigJs.externals).forEach((package) => {
          packageJson.dependencies[package] =
            originalPackageJson.dependencies[package];
        });
      }
      return packageJson;
    },
    packageAfterPrune: async (
      forgeConfig,
      buildPath,
      electronVersion,
      platform,
      arch,
    ) => {
      const npmInstall = spawnSync("npm", ["install", "--omit=dev"], {
        cwd: buildPath,
        stdio: "inherit",
        shell: true,
      });

      // Clear out prebuilds for other architectures
      // 1) we don't need them
      // 2) windows binary signing tool blows up when it tries to sign them.

      const prebuilds = glob.GlobSync(`${buildPath}/**/prebuilds/*`);
      const matchString = new RegExp(`prebuilds/${platform}`);
      prebuilds.found.forEach(function (path) {
        if (!path.match(matchString)) {
          fs.rmSync(path, { recursive: true });
        }
      });
      // Workaround from     https://www.update.rocks/blog/fixing-the-python3/
      if (platform === "darwin") {
        // Directory to inspect
        const dirPath = path.join(
          buildPath,
          "node_modules/macos-alias/build/node_gyp_bins",
        );
        // Check if the directory exists
        if (fs.existsSync(dirPath)) {
          // List files in the directory
          console.log("Contents of the directory before removal: ");
          const files = fs.readdirSync(path.join(dirPath));
          files.forEach((file) => {
            console.log(file);
          });

          // Files to remove
          const filesToRemove = ["python", "python2", "python3"];

          // Remove files if they exist
          filesToRemove.forEach((file) => {
            const filePath = path.join(dirPath, file);
            if (fs.existsSync(filePath)) {
              console.log(`Removing file: ${file}`);
              fs.unlinkSync(filePath);
            }
          });
        } else {
          console.log(`Directory not found: ${dirPath}`);
        }
      }
    },
  },
};
if (process.env.UNTRUSTED) {
  delete config["packagerConfig"]["osxSign"];
  delete config["packagerConfig"]["osxNotarize"];
}

module.exports = config;
