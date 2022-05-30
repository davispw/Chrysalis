// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2018-2022  Keyboardio, Inc.
 * Copyright (C) 2020  DygmaLab SE.
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

import Skeleton from "@mui/material/Skeleton";
import {
  hideContextBar,
  showContextBar,
} from "@renderer/components/ContextBar";
import { GlobalContext } from "@renderer/components/GlobalContext";
import React, { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";

import Brightness from "./leds/Brightness";
import IdleTimeLimit from "./leds/IdleTimeLimit";
import PreferenceSection from "../components/PreferenceSection";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const KeyboardLEDPreferences = (props) => {
  const { t } = useTranslation();
  const globalContext = useContext(GlobalContext);
  const [activeDevice] = globalContext.state.activeDevice;
  const [hasBrightness, setHasBrightness] = useState(false);
  const [hasIdleTime, setHasIdleTime] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const {
    modified,
    setModified,
    ledBrightness,
    setLedBrightness,
    ledIdleTimeLimit,
    setLedIdleTimeLimit,
  } = props;

  // Do the initial loading
  useEffect(() => {
    const initialize = async () => {
      const plugins = await activeDevice.plugins();
      const commands = await activeDevice.supported_commands();

      if (plugins.includes("PersistentIdleLEDs")) {
        setHasIdleTime(true);
      }
      if (commands.includes("led.brightness")) {
        setHasBrightness(true);
      }

      setInitialized(true);
    };

    if (!initialized) initialize();
  }, [activeDevice, initialized]);

  // Fetch the data, once we're initialized
  useEffect(() => {
    const fetchData = async () => {
      if (hasBrightness) {
        let brightness = await activeDevice.focus.command("led.brightness");
        brightness = parseInt(brightness);
        setLedBrightness(brightness);
      }

      if (hasIdleTime) {
        let limit = await activeDevice.focus.command("idleleds.time_limit");
        limit = parseInt(limit);
        setLedIdleTimeLimit(limit);
      }

      setLoaded(true);
    };

    const context_bar_channel = new BroadcastChannel("context_bar");
    context_bar_channel.onmessage = async (event) => {
      if (event.data === "changes-discarded") {
        await fetchData();
        setModified(false);
      }
    };

    if (initialized) {
      fetchData();
    }

    return () => {
      context_bar_channel.close();
    };
  }, [
    activeDevice,
    hasBrightness,
    hasIdleTime,
    initialized,
    setLedBrightness,
    setLedIdleTimeLimit,
    setModified,
  ]);

  const selectIdleLEDTime = (event) => {
    setLedIdleTimeLimit(event.target.value);
    setModified(true);
    showContextBar();
  };

  const setBrightness = (event, value) => {
    setLedBrightness(value);
    setModified(true);
    showContextBar();
  };

  if (initialized && !hasIdleTime && !hasBrightness) return null;

  return (
    <PreferenceSection name="keyboard.led">
      {loaded ? (
        <IdleTimeLimit
          visible={hasIdleTime}
          onChange={selectIdleLEDTime}
          value={ledIdleTimeLimit}
        />
      ) : (
        <Skeleton variant="rectangle" width={422} height={79} sx={{ mb: 2 }} />
      )}
      {loaded ? (
        <Brightness
          onChange={setBrightness}
          value={ledBrightness}
          visible={hasBrightness}
        />
      ) : (
        <Skeleton variant="rectangle" width={422} height={79} sx={{ mb: 2 }} />
      )}
    </PreferenceSection>
  );
};

export { KeyboardLEDPreferences as default };
