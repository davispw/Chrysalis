// -*- mode: js-jsx -*-
/* Chrysalis -- Kaleidoscope Command Center
 * Copyright (C) 2019-2022  Keyboardio, Inc.
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

import KeymapDB from "@api/focus/keymap/db";
import Tooltip from "@renderer/components/Tooltip";
import useTheme from "@mui/material/styles/useTheme";
import React from "react";
const db = new KeymapDB();

const keycapunit = 50;

const KeySelector = (props) => {
  const keymap = db.getStandardLayout();
  const theme = useTheme();
  const { currentKeyCode, onKeySelect } = props;

  const getKey = (row, col) => {
    if (keymap[row]) {
      return db.lookup(keymap[row][col]);
    } else {
      return {
        label: {},
      };
    }
  };

  const Key = (props) => {
    const { row, col } = props;

    const key = getKey(row, col);

    // Let's use the 1u versions of labels for 1.25, 1.5, 1.75, 2 u keys so we can make the text bigger
    const label = db.format(key, {
      keycapSize: (props.width <= 2 ? 1 : props.width) + "u",
    });

    const y_factor = keycapunit * 0.8;

    const x = props.x * keycapunit;
    const y = props.y * y_factor;
    const active = key.code == currentKeyCode;
    const stroke = theme.palette.divider;
    const height = props.height * y_factor;
    const width = props.width * keycapunit;
    const fontSize = label.main.length <= 4 * props.width ? Math.round(keycapunit / 3) : Math.round(keycapunit / 4);
    const mainLegendY = y + height / 2;

    const buttonColor = active ? theme.palette.primary.light : theme.palette.background.paper;

    const textColor = theme.palette.getContrastText(buttonColor);

    const onClick = (event) => {
      return onKeySelect(event.currentTarget.getAttribute("data-key-code"));
    };

    let tooltipText = "";
    if (label.shifted) {
      tooltipText = label.main + " / " + label.shifted;
    }

    return (
      <Tooltip title={tooltipText} placement="top">
        <g onClick={onClick} className="key" data-key-code={key.code}>
          <rect x={x} y={y} rx={2} width={width} height={height} stroke={stroke} strokeWidth={2} fill={buttonColor} />

          <text
            x={x + width / 2}
            y={mainLegendY}
            fill={textColor}
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize={fontSize}
          >
            {label.main}
          </text>
        </g>
      </Tooltip>
    );
  };

  return (
    <svg
      viewBox={"0 0 " + Math.round(23 * keycapunit + 1).toString() + " " + Math.round(6.5 * keycapunit + 1).toString()}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
      className={props.className}
      style={{
        display: "block",
        fontWeight: 400,
        maxHeight: "15rem",
        maxWidth: "100%",

        fontSize: Math.round(keycapunit / 4),
      }}
    >
      <g transform="">
        <g>
          <Key row={0} col={0} width={1} height={1} x={0} y={0} />

          <Key row={0} col={1} width={1} height={1} x={2} y={0} />
          <Key row={0} col={2} width={1} height={1} x={3} y={0} />
          <Key row={0} col={3} width={1} height={1} x={4} y={0} />
          <Key row={0} col={4} width={1} height={1} x={5} y={0} />

          <Key row={0} col={5} width={1} height={1} x={6.5} y={0} />
          <Key row={0} col={6} width={1} height={1} x={7.5} y={0} />
          <Key row={0} col={7} width={1} height={1} x={8.5} y={0} />
          <Key row={0} col={8} width={1} height={1} x={9.5} y={0} />

          <Key row={0} col={9} width={1} height={1} x={11} y={0} />
          <Key row={0} col={10} width={1} height={1} x={12} y={0} />
          <Key row={0} col={11} width={1} height={1} x={13} y={0} />
          <Key row={0} col={12} width={1} height={1} x={14} y={0} />
        </g>

        <g>
          <Key row={1} col={0} width={1} height={1} x={0} y={1.5} />
          <Key row={1} col={1} width={1} height={1} x={1} y={1.5} />
          <Key row={1} col={2} width={1} height={1} x={2} y={1.5} />
          <Key row={1} col={3} width={1} height={1} x={3} y={1.5} />
          <Key row={1} col={4} width={1} height={1} x={4} y={1.5} />
          <Key row={1} col={5} width={1} height={1} x={5} y={1.5} />
          <Key row={1} col={6} width={1} height={1} x={6} y={1.5} />
          <Key row={1} col={7} width={1} height={1} x={7} y={1.5} />
          <Key row={1} col={8} width={1} height={1} x={8} y={1.5} />
          <Key row={1} col={9} width={1} height={1} x={9} y={1.5} />
          <Key row={1} col={10} width={1} height={1} x={10} y={1.5} />
          <Key row={1} col={11} width={1} height={1} x={11} y={1.5} />
          <Key row={1} col={12} width={1} height={1} x={12} y={1.5} />
          <Key row={1} col={13} width={2} height={1} x={13} y={1.5} />

          <Key row={1} col={14} width={1} height={1} x={15.5} y={1.5} />
          <Key row={1} col={15} width={1} height={1} x={16.5} y={1.5} />
          <Key row={1} col={16} width={1} height={1} x={17.5} y={1.5} />

          <Key row={1} col={17} width={1} height={1} x={19} y={1.5} />
          <Key row={1} col={18} width={1} height={1} x={20} y={1.5} />
          <Key row={1} col={19} width={1} height={1} x={21} y={1.5} />
          <Key row={1} col={20} width={1} height={1} x={22} y={1.5} />
        </g>

        <g>
          <Key row={2} col={0} width={1.5} height={1} x={0} y={2.5} />
          <Key row={2} col={1} width={1} height={1} x={1.5} y={2.5} />
          <Key row={2} col={2} width={1} height={1} x={2.5} y={2.5} />
          <Key row={2} col={3} width={1} height={1} x={3.5} y={2.5} />
          <Key row={2} col={4} width={1} height={1} x={4.5} y={2.5} />
          <Key row={2} col={5} width={1} height={1} x={5.5} y={2.5} />
          <Key row={2} col={6} width={1} height={1} x={6.5} y={2.5} />
          <Key row={2} col={7} width={1} height={1} x={7.5} y={2.5} />
          <Key row={2} col={8} width={1} height={1} x={8.5} y={2.5} />
          <Key row={2} col={9} width={1} height={1} x={9.5} y={2.5} />
          <Key row={2} col={10} width={1} height={1} x={10.5} y={2.5} />
          <Key row={2} col={11} width={1} height={1} x={11.5} y={2.5} />
          <Key row={2} col={12} width={1} height={1} x={12.5} y={2.5} />
          <Key row={2} col={13} width={1.5} height={1} x={13.5} y={2.5} />

          <Key row={2} col={14} width={1} height={1} x={15.5} y={2.5} />
          <Key row={2} col={15} width={1} height={1} x={16.5} y={2.5} />
          <Key row={2} col={16} width={1} height={1} x={17.5} y={2.5} />

          <Key row={2} col={17} width={1} height={1} x={19} y={2.5} />
          <Key row={2} col={18} width={1} height={1} x={20} y={2.5} />
          <Key row={2} col={19} width={1} height={1} x={21} y={2.5} />
          <Key row={2} col={20} width={1} height={2} x={22} y={2.5} />
        </g>

        <g>
          <Key row={3} col={0} width={1.75} height={1} x={0} y={3.5} />
          <Key row={3} col={1} width={1} height={1} x={1.75} y={3.5} />
          <Key row={3} col={2} width={1} height={1} x={2.75} y={3.5} />
          <Key row={3} col={3} width={1} height={1} x={3.75} y={3.5} />
          <Key row={3} col={4} width={1} height={1} x={4.75} y={3.5} />
          <Key row={3} col={5} width={1} height={1} x={5.75} y={3.5} />
          <Key row={3} col={6} width={1} height={1} x={6.75} y={3.5} />
          <Key row={3} col={7} width={1} height={1} x={7.75} y={3.5} />
          <Key row={3} col={8} width={1} height={1} x={8.75} y={3.5} />
          <Key row={3} col={9} width={1} height={1} x={9.75} y={3.5} />
          <Key row={3} col={10} width={1} height={1} x={10.75} y={3.5} />
          <Key row={3} col={11} width={1} height={1} x={11.75} y={3.5} />
          <Key row={3} col={12} width={2.25} height={1} x={12.75} y={3.5} />

          <Key row={3} col={13} width={1} height={1} x={15.5} y={3.5} />
          <Key row={3} col={14} width={1} height={1} x={16.5} y={3.5} />
          <Key row={3} col={15} width={1} height={1} x={17.5} y={3.5} />

          <Key row={3} col={16} width={1} height={1} x={19} y={3.5} />
          <Key row={3} col={17} width={1} height={1} x={20} y={3.5} />
          <Key row={3} col={18} width={1} height={1} x={21} y={3.5} />
        </g>

        <g>
          <Key row={4} col={0} width={1.25} height={1} x={0} y={4.5} />
          <Key row={4} col={1} width={1} height={1} x={1.25} y={4.5} />
          <Key row={4} col={2} width={1} height={1} x={2.25} y={4.5} />
          <Key row={4} col={3} width={1} height={1} x={3.25} y={4.5} />
          <Key row={4} col={4} width={1} height={1} x={4.25} y={4.5} />
          <Key row={4} col={5} width={1} height={1} x={5.25} y={4.5} />
          <Key row={4} col={6} width={1} height={1} x={6.25} y={4.5} />
          <Key row={4} col={7} width={1} height={1} x={7.25} y={4.5} />
          <Key row={4} col={8} width={1} height={1} x={8.25} y={4.5} />
          <Key row={4} col={9} width={1} height={1} x={9.25} y={4.5} />
          <Key row={4} col={10} width={1} height={1} x={10.25} y={4.5} />
          <Key row={4} col={11} width={1} height={1} x={11.25} y={4.5} />
          <Key row={4} col={12} width={2.75} height={1} x={12.25} y={4.5} />

          <Key row={4} col={13} width={1} height={1} x={16.5} y={4.5} />

          <Key row={4} col={14} width={1} height={1} x={19} y={4.5} />
          <Key row={4} col={15} width={1} height={1} x={20} y={4.5} />
          <Key row={4} col={16} width={1} height={1} x={21} y={4.5} />
          <Key row={4} col={17} width={1} height={2} x={22} y={4.5} />
        </g>

        <g>
          <Key row={5} col={0} width={1.25} height={1} x={0} y={5.5} />
          <Key row={5} col={1} width={1.25} height={1} x={1.25} y={5.5} />
          <Key row={5} col={2} width={1.25} height={1} x={2.5} y={5.5} />

          <Key row={5} col={3} width={6.25} height={1} x={3.75} y={5.5} />

          <Key row={5} col={4} width={1.25} height={1} x={10} y={5.5} />
          <Key row={5} col={5} width={1.25} height={1} x={11.25} y={5.5} />
          <Key row={5} col={6} width={1.25} height={1} x={12.5} y={5.5} />
          <Key row={5} col={7} width={1.25} height={1} x={13.75} y={5.5} />

          <Key row={5} col={8} width={1} height={1} x={15.5} y={5.5} />
          <Key row={5} col={9} width={1} height={1} x={16.5} y={5.5} />
          <Key row={5} col={10} width={1} height={1} x={17.5} y={5.5} />

          <Key row={5} col={11} width={2} height={1} x={19} y={5.5} />
          <Key row={5} col={12} width={1} height={1} x={21} y={5.5} />
        </g>
      </g>
    </svg>
  );
};
export default KeySelector;
