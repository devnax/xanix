import pc from "picocolors";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mkdir, realpath, writeFile } from "node:fs/promises";

import { processDir } from "../include/process.js";
import { getFrameworkPackageJson } from "../include/utils.js";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const runOrPrint = (commands: string[][], canRun: boolean) => {
  if (canRun) {
    for (const [cmd, ...args] of commands) {
      execFileSync(cmd, args, { stdio: "inherit" });
    }

    return;
  }

  console.log(pc.gray("To complete startup setup, run:"));
  console.log("");

  for (const command of commands) {
    console.log(`  ${pc.cyan(command.join(" "))}`);
  }

  console.log("");
};

const startup = async () => {
  const packageJson = await getFrameworkPackageJson();
  const node = process.execPath;
  const cli = await realpath(process.argv[1]);
  const user = os.userInfo().username;
  const home = os.homedir();

  console.log("");
  console.log(pc.cyan(pc.bold(`Xanix ${packageJson.version}`)));
  console.log("");

  await mkdir(processDir, { recursive: true });

  if (process.platform === "linux") {
    const service = `xanix-${user.replace(/[^a-zA-Z0-9_.@-]/g, "-")}`;
    const unitPath = path.join(processDir, `${service}.service`);
    const target = `/etc/systemd/system/${service}.service`;

    const quoteSystemd = (value: string) =>
      `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

    await writeFile(
      unitPath,
      [
        "[Unit]",
        "Description=Xanix process manager",
        "After=network.target",
        "",
        "[Service]",
        "Type=oneshot",
        "RemainAfterExit=yes",
        `User=${user}`,
        `Environment="HOME=${home.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        `Environment="PATH=${(process.env.PATH ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
        `ExecStart=${quoteSystemd(node)} ${quoteSystemd(cli)} resurrect`,
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "",
      ].join("\n"),
      "utf8",
    );

    const isRoot = process.getuid?.() === 0;
    const sudo = isRoot ? [] : ["sudo"];

    runOrPrint(
      [
        [...sudo, "cp", unitPath, target],
        [...sudo, "systemctl", "daemon-reload"],
        [...sudo, "systemctl", "enable", service],
      ],
      isRoot,
    );
  } else if (process.platform === "darwin") {
    const label = "com.xanix.resurrect";
    const launchAgentsDir = path.join(home, "Library", "LaunchAgents");
    const plistPath = path.join(launchAgentsDir, `${label}.plist`);
    const uid = process.getuid?.();

    if (uid === undefined) {
      console.log(`${pc.red("✗")} Unable to determine macOS user ID.`);
      console.log("");
      return;
    }

    await mkdir(launchAgentsDir, { recursive: true });

    await writeFile(
      plistPath,
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
        "<dict>",
        "  <key>Label</key>",
        `  <string>${escapeXml(label)}</string>`,
        "  <key>ProgramArguments</key>",
        "  <array>",
        `    <string>${escapeXml(node)}</string>`,
        `    <string>${escapeXml(cli)}</string>`,
        "    <string>resurrect</string>",
        "  </array>",
        "  <key>RunAtLoad</key>",
        "  <true/>",
        "</dict>",
        "</plist>",
        "",
      ].join("\n"),
      "utf8",
    );

    try {
      execFileSync("launchctl", ["bootout", `gui/${uid}`, label], {
        stdio: "ignore",
      });
    } catch {
      // The job may not have been loaded previously.
    }

    execFileSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath], {
      stdio: "inherit",
    });

    execFileSync("launchctl", ["enable", `gui/${uid}/${label}`], {
      stdio: "inherit",
    });
  } else if (process.platform === "win32") {
    const startupDir = path.join(processDir, "startup");
    const commandFile = path.join(startupDir, "resurrect.cmd");

    await mkdir(startupDir, { recursive: true });

    const escapeCmd = (value: string) =>
      value.replace(/%/g, "%%").replace(/"/g, '""');

    await writeFile(
      commandFile,
      [
        "@echo off",
        `cd /d "${escapeCmd(home)}"`,
        `"${escapeCmd(node)}" "${escapeCmd(cli)}" resurrect`,
        "",
      ].join("\r\n"),
      "utf8",
    );

    try {
      execFileSync(
        "schtasks",
        [
          "/Create",
          "/TN",
          "Xanix",
          "/TR",
          `"${process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe"}" /c "${commandFile}"`,
          "/SC",
          "ONLOGON",
          "/F",
        ],
        { stdio: "inherit" },
      );

      console.log(`${pc.green("✓")} Startup task registered.`);
      console.log("");
    } catch {
      // Fall back to the current user's Startup folder.
      const appData = process.env.APPDATA;

      if (!appData) {
        console.log(
          `${pc.red("✗")} Could not locate the Windows Startup folder.`,
        );
        console.log("");
        return;
      }

      const userStartup = path.join(
        appData,
        "Microsoft",
        "Windows",
        "Start Menu",
        "Programs",
        "Startup",
      );

      await mkdir(userStartup, { recursive: true });

      const shortcutScript = path.join(userStartup, "Xanix.cmd");

      await writeFile(
        shortcutScript,
        [
          "@echo off",
          `cd /d "${escapeCmd(home)}"`,
          `"${escapeCmd(node)}" "${escapeCmd(cli)}" resurrect`,
          "",
        ].join("\r\n"),
        "utf8",
      );

      console.log(
        `${pc.green("✓")} Xanix startup configured for the current user.`,
      );
      console.log(
        pc.gray(
          "Saved in the Windows Startup folder; no scheduled task required.",
        ),
      );
      console.log("");
    }
  } else {
    console.log(`${pc.red("✗")} Unsupported platform: ${process.platform}`);
    console.log("");
    return;
  }

  console.log(`${pc.green("✓")} Startup script configured`);
  console.log("");
  console.log(
    pc.gray(
      `Run ${pc.cyan("xanix save")} to store running servers so they can be restored at startup.`,
    ),
  );
  console.log("");
};

export default startup;
