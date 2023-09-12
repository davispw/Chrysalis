/* chrysalis-flash -- Keyboard flash helpers for Chrysalis
 * Copyright (C) 2018-2022  Keyboardio, Inc.
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { logger } from "@api/log";


/*
const runDFU = async (args) => {
  const dfuUtil = (
    path.join("dfu-util", `${process.platform}-${process.arch}`, "dfu-util")
  );

  const maxFlashingTime = 1000 * 60 * 5;

  return new Promise((resolve, reject) => {
    console.debug("running dfu-util", { dfuUtil, args });
    const child = spawn(dfuUtil, args);
    const timer = setTimeout(() => {
      child.kill();
      console.error("dfu-util timed out");
      reject(runDFUError.HARD_FAIL);
    }, maxFlashingTime);
    child.on("error", (err) => {
      clearTimeout(timer);
      console.error("error starting dfu-util", { err: err.toString() });
      reject(runDFUError.HARD_FAIL);
    });
    child.stdout.on("data", (data) => {
      console.debug("dfu-util:stdout:", { data: data.toString() });
    });
    child.stderr.on("data", (data) => {
      console.debug("dfu-util:stderr:", { data: data.toString() });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code == 0 || code == 251) {
        console.debug("dfu-util done");
        resolve();
      } else if (code == 74) {
        console.error("dfu-util exited abnormally", {
          exitCode: code,
        });
        reject(runDFUError.SOFT_FAIL);
      } else {
        console.error("dfu-util exited abnormally", {
          exitCode: code,
        });
        reject(runDFUError.HARD_FAIL);
      }
    });
  });
};

*/

const formatDeviceUSBId = (desc) => {
  return desc.vendorId.toString(16) + ":" + desc.productId.toString(16);
};

const rebootToApplicationMode = async (port, device) => {
  console.debug("rebooting to application mode");
  /* TODO

  try {
    await runDFUUtil([
      "--device",
      formatDeviceUSBId(device.usb) +
        "," +
        formatDeviceUSBId(device.usb.bootloader),
      "--detach",
    ]);
  } catch (e) {
    if (e == runDFUError.HARD_FAIL) {
      throw e;
    }
  }
  */
};

const flash = async (board, port, filename, options) => {
  const callback = options
    ? options.callback
    : function () {
        return;
      };
  const device = options.device;

  /* TODO

  await runDFUUtil([
    "--device",
    formatDeviceUSBId(device.usb) +
      "," +
      formatDeviceUSBId(device.usb.bootloader),
    "--alt",
    "0",
    "--intf",
    "0",
    "--download",
    filename,
  ]);
  */
};

export const WebDFUFlasher = { rebootToApplicationMode, flash };
