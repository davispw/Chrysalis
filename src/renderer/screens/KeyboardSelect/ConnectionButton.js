// -*- mode: js-jsx -*-
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

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import React from "react";
import { useTranslation } from "react-i18next";

export const ConnectionButton = (props) => {
  const { disabled, opening, connected, connectKeyboard, disconnectKeyboard, isDfuMode } = props;
  const { t } = useTranslation();

  if (connected) {
    return (
      <Button
        disabled={disabled}
        variant="outlined"
        color="secondary"
        onClick={disconnectKeyboard}
        sx={{ verticalAlign: "bottom", marginLeft: "auto", marginRight: 3 }}
      >
        {t("keyboardSelect.disconnect")}
      </Button>
    );
  }

  return (
    <Button
      disabled={disabled}
      variant="contained"
      color="primary"
      onClick={connectKeyboard}
      sx={{ verticalAlign: "bottom", marginLeft: "auto", marginRight: 3 }}
    >
      {opening ? (
        <CircularProgress color="secondary" size={16} />
      ) : isDfuMode ? (
        t("keyboardSelect.dfuConnect")
      ) : (
        t("keyboardSelect.connect")
      )}
    </Button>
  );
};
