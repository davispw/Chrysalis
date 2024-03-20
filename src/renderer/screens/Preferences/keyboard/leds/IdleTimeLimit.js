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

import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";

import { GlobalContext } from "@renderer/components/GlobalContext";
import useDataLoadedFromActiveDevice from "@renderer/hooks/useDataLoadedFromActiveDevice";
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";

import PreferenceWithHeading from "../../components/PreferenceWithHeading";

const IdleTimeLimit = (props) => {
  const { t } = useTranslation();
  const { onSaveChanges } = props;

  const [activeDevice] = useContext(GlobalContext).state.activeDevice;

  const [ledIdleTimeLimit, setLedIdleTimeLimit] = useState(0);

  const initialize = async () => {
    let limit = await activeDevice.idleleds_time_limit();
    limit = parseInt(limit);

    setLedIdleTimeLimit(limit);
  };
  const loaded = useDataLoadedFromActiveDevice(initialize);

  const onChange = async (event) => {
    const limit = event.target.value;
    await setLedIdleTimeLimit(limit);
    await onSaveChanges("idleleds.time_limit", function () {
      activeDevice.idleleds_time_limit(limit);
    });
  };

  return (
    <PreferenceWithHeading
      heading={t("preferences.keyboard.led.idle.label")}
      subheading={t("preferences.keyboard.led.idle.help")}
    >
      {loaded ? (
        <FormControl size="small">
          <Select onChange={onChange} value={ledIdleTimeLimit} sx={{ width: "10em" }}>
            <MenuItem value={0}>{t("preferences.keyboard.led.idle.disabled")}</MenuItem>
            <MenuItem value={60}>{t("preferences.keyboard.led.idle.oneMinute")}</MenuItem>
            <MenuItem value={120}>{t("preferences.keyboard.led.idle.twoMinutes")}</MenuItem>
            <MenuItem value={180}>{t("preferences.keyboard.led.idle.threeMinutes")}</MenuItem>
            <MenuItem value={240}>{t("preferences.keyboard.led.idle.fourMinutes")}</MenuItem>
            <MenuItem value={300}>{t("preferences.keyboard.led.idle.fiveMinutes")}</MenuItem>
            <MenuItem value={600}>{t("preferences.keyboard.led.idle.tenMinutes")}</MenuItem>
            <MenuItem value={900}>{t("preferences.keyboard.led.idle.fifteenMinutes")}</MenuItem>
            <MenuItem value={1200}>{t("preferences.keyboard.led.idle.twentyMinutes")}</MenuItem>
            <MenuItem value={1800}>{t("preferences.keyboard.led.idle.thirtyMinutes")}</MenuItem>
            <MenuItem value={3600}>{t("preferences.keyboard.led.idle.sixtyMinutes")}</MenuItem>
          </Select>
        </FormControl>
      ) : (
        <Skeleton variant="rectangle" width="10em" height={40} />
      )}
    </PreferenceWithHeading>
  );
};

export { IdleTimeLimit as default };
