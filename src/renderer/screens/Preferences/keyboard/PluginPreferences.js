// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2022  Keyboardio, Inc.
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

import usePluginCheck from "@renderer/hooks/usePluginCheck";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import PreferenceSection from "../components/PreferenceSection";
import EscapeOneShotPreferences from "./plugins/EscapeOneShot";

const PluginPreferences = (props) => {
  const { t } = useTranslation();
  const { registerModifications } = props;

  const [loaded, plugins] = usePluginCheck(["EscapeOneShot"]);

  const foundSomePlugins = Object.values(plugins).filter((v) => v).length > 0;
  if (loaded && !foundSomePlugins) return null;

  return (
    <PreferenceSection name="keyboard.plugins" loaded={loaded}>
      {plugins["EscapeOneShot"] && (
        <EscapeOneShotPreferences
          registerModifications={registerModifications}
        />
      )}
    </PreferenceSection>
  );
};

export { PluginPreferences as default };
