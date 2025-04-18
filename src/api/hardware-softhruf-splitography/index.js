/* chrysalis-hardware-softhruf-splitography -- Chrysalis SOFT/HRUF Splitography library
 * Copyright (C) 2019-2022  Keyboard.io, Inc.
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

import { flash, flashers } from "@api/flash";
import Keymap from "./components/Keymap";

const Splitography = {
  info: {
    vendor: "SOFT/HRUF",
    product: "Splitography",
    displayName: "Splitography",
    urls: [
      {
        name: "Homepage",
        url: "https://softhruf.love/collections/writers",
      },
    ],
  },
  usb: {
    vendorId: 0xfeed,
    productId: 0x6060,
    bootloader: {
      vendorId: 0x03eb,
      productId: 0x2ff4,
      protocol: "flip",
    },
  },
  keyboard: {
    rows: 4,
    columns: 12,
  },
  components: {
    keymap: Keymap,
  },

  flash: async (port, filename, options) => {
    return await flash(flashers.dfuProgrammer, null, port, filename, options);
  },
};

export { Splitography };
