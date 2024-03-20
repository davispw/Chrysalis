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

import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { GlobalContext } from "@renderer/components/GlobalContext";
import { PageTitle } from "@renderer/components/PageTitle";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { DevtoolsPreferences } from "./Preferences/Devtools";
import { MyKeyboardPreferences } from "./Preferences/MyKeyboard";
import { UserInterfacePreferences } from "./Preferences/UserInterface";

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            height: "100%",
            mt: 2,
            px: 5,
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
function a11yProps(index) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

function Preferences(props) {
  const [value, setValue] = React.useState(1);
  const globalContext = useContext(GlobalContext);

  const [inContext, setInContext] = React.useState(false);
  const [connected, setConnected] = globalContext.state.connected;

  if (!connected && value == 1) {
    setValue(0);
  }
  const { t } = useTranslation();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
      }}
    >
      <PageTitle title={t("app.menu.preferences")} />
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        sx={{
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "left",
          width: 300,
          position: "fixed",
          top: "48px",
          bottom: 0,
        }}
      >
        <Tab label={t("preferences.interface")} disabled={inContext} {...a11yProps(0)} />
        <Tab label={t("preferences.keyboard.title")} disabled={!connected} {...a11yProps(1)} />
        <Tab label={t("preferences.devtools.main.label")} disabled={inContext} {...a11yProps(2)} />
      </Tabs>
      <Box
        sx={{
          flexGrow: 1,
          ml: "300px",
        }}
      >
        <TabPanel value={value} index={0}>
          <UserInterfacePreferences />
        </TabPanel>

        <TabPanel value={value} index={1}>
          <MyKeyboardPreferences setInContext={setInContext} onDisconnect={props.onDisconnect} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <DevtoolsPreferences />
        </TabPanel>
      </Box>
    </Box>
  );
}

export default Preferences;
