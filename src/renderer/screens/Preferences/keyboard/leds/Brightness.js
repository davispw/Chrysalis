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
import Slider from "@mui/material/Slider";
import { GlobalContext } from "@renderer/components/GlobalContext";

import useDataLoadedFromActiveDevice from "@renderer/hooks/useDataLoadedFromActiveDevice";
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";

import PreferenceWithHeading from "../../components/PreferenceWithHeading";

const Brightness = (props) => {
  const { t } = useTranslation();
  const { onSaveChanges } = props;

  const [ledBrightness, setLedBrightness] = useState(255);
  const [activeDevice] = useContext(GlobalContext).state.activeDevice;

  const initialize = async () => {
    let brightness = await activeDevice.led_brightness();
    brightness = parseInt(brightness);

    setLedBrightness(brightness);
  };
  const loaded = useDataLoadedFromActiveDevice(initialize);

  const formatValue = (value) => {
    return ((value / 255) * 100).toFixed(0) + "%";
  };

  const onChange = async (event) => {
    const brightness = event.target.value;
    await setLedBrightness(brightness);
    await onSaveChanges("led.brightness", function () {
      activeDevice.led_brightness(brightness);
    });
  };

  return (
    <PreferenceWithHeading
      heading={t("preferences.keyboard.led.brightness.label")}
      subheading={t("preferences.keyboard.led.brightness.help")}
    >
      {loaded ? (
        <Slider
          max={255}
          step={16}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={formatValue}
          value={ledBrightness}
          onChange={onChange}
          sx={{ width: "20em", mr: 1 }}
        />
      ) : (
        <Skeleton variant="rectangle" width="20em" height={30} />
      )}
    </PreferenceWithHeading>
  );
};

export { Brightness as default };
