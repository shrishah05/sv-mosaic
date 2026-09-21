import * as React from "react";
import { useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import styled from "styled-components";

import type { DataViewColumnControlProps } from "./DataViewColumnControlTypes";

import Button from "../../Button";
import DataViewColumnDrawer from "../DataViewColumDrawer";
import { useMosaicTranslation } from "@root/i18n";

const VisuallyHiddenStatus = styled.span`
	border: 0;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	height: 1px;
	margin: -1px;
	overflow: hidden;
	padding: 0;
	position: absolute;
	white-space: nowrap;
	width: 1px;
`;

export default function DataViewColumnControl(props: DataViewColumnControlProps) {
	const [state, setState] = useState({
		open : false,
	});
	const [announcement, setAnnouncement] = useState("");

	const { t } = useMosaicTranslation();

	const gearClick = function() {
		setState({
			...state,
			open : !state.open,
		});
	};

	const onColumnsChange = function(activeColumns: string[]) {
		props.onChange?.(activeColumns);
		setAnnouncement(`Columns updated. ${activeColumns.length} ${activeColumns.length === 1 ? "column" : "columns"} now visible.`);
	};

	return (
		<div>
			<VisuallyHiddenStatus aria-live="polite" role="status">
				{announcement}
			</VisuallyHiddenStatus>
			<Button
				intent="secondary"
				label={t("mosaic:DataView.columns")}
				variant="text"
				mIcon={SettingsIcon}
				onClick={gearClick}
				iconPosition="left"
				tooltip="Update columns and their order"
			/>
			{
				props.onChange !== undefined && (
					<DataViewColumnDrawer
						open={state.open}
						columns={props.columns}
						allColumns={props.allColumns}
						onChange={onColumnsChange}
						onClose={gearClick}
					/>
				)
			}
		</div>
	);
}
