/* Chrysalis -- Kaleidoscope Command Center
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

import Focus from "@api/focus";
import { Hardware, supportedDeviceVIDPIDs } from "@api/hardware";
import logger from "@renderer/utils/Logger";

// returns a promise that resolves to a Focus object
export const connectToSerialport = async (targetVid, targetPid) => {
  const focus = new Focus();
  let serialPort;

  const openPort = async () => {
    while (!serialPort) {
      try {
        let filters = supportedDeviceVIDPIDs();

        // If we have target VID/PID, only look for that specific device
        if (targetVid && targetPid) {
          filters = [
            {
              usbVendorId: targetVid,
              usbProductId: targetPid,
            },
          ];
        }

        serialPort = await navigator.serial.requestPort({
          filters: filters,
        });
      } catch (e) {
        if (!serialPort) {
          logger.error(
            "I couldn't connect to your keyboard's serial port. That might be because another program or browser window is already connected.",
            e
          );
          return;
        }
      }
    }

    // Wait for the serial port to open.
    if (serialPort.readable && serialPort.writable) {
      try {
        if (serialPort.readable) {
          const reader = serialPort.readable.getReader();
          try {
            // Attempt to cancel ongoing read operation
            await reader.cancel();
          } catch (error) {
            console.error("Error canceling the read operation:", error);
          } finally {
            // Always release the lock
            reader.releaseLock();
          }
        }

        if (serialPort.writable) {
          const writer = serialPort.writable.getWriter();
          try {
            // Attempt to cancel ongoing write operation
            await writer.abort();
          } catch (error) {
            console.error("Error aborting the write operation:", error);
          } finally {
            // Always release the lock
            writer.releaseLock();
          }
        }
        await serialPort.close();
      } catch (e) {
        logger.error("Error closing the port", e);
      }
    }
    await serialPort.open({ baudRate: 9600 });
  };

  try {
    await openPort();

    if (!serialPort) {
      logger.log("No serialport selected");
      return null;
    }

    const info = serialPort.getInfo();
    const dVid = info.usbVendorId;
    const dPid = info.usbProductId;

    // If we have target VID/PID, check if this device matches
    if (targetVid && targetPid && (dVid !== targetVid || dPid !== targetPid)) {
      return null;
    }

    logger.log("The connected device:", info);
    for (const hw of Hardware.devices) {
      let found = false;
      let bootloader = false;
      if (dVid == hw.usb.vendorId && dPid == hw.usb.productId) {
        found = true;
        logger.log("Found a keyboard", hw);
        focus.open(serialPort, hw);
      } else if (dVid == hw.usb.bootloader?.vendorId && dPid == hw.usb.bootloader?.productId) {
        found = true;
        bootloader = true;
        logger.log("Found a keyboard bootloader", hw);

        focus.open(serialPort, hw);
      }
      if (!found) continue;
    }

    return focus;
  } catch (e) {
    logger.error("Failed to open serial port", e);
    throw e;
  }
};
