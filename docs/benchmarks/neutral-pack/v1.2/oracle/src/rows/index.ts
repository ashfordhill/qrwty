// Registry: one module per acceptance ID (A01-A24, F01-F10, R01-R06, U02-U08).
import A01 from "./A01.ts";
import A02 from "./A02.ts";
import A03 from "./A03.ts";
import A04 from "./A04.ts";
import A05 from "./A05.ts";
import A06 from "./A06.ts";
import A07 from "./A07.ts";
import A08 from "./A08.ts";
import A09 from "./A09.ts";
import A10 from "./A10.ts";
import A11 from "./A11.ts";
import A12 from "./A12.ts";
import A13 from "./A13.ts";
import A14 from "./A14.ts";
import A15 from "./A15.ts";
import A16 from "./A16.ts";
import A17 from "./A17.ts";
import A18 from "./A18.ts";
import A19 from "./A19.ts";
import A20 from "./A20.ts";
import A21 from "./A21.ts";
import A22 from "./A22.ts";
import A23 from "./A23.ts";
import A24 from "./A24.ts";
import F01 from "./F01.ts";
import F02 from "./F02.ts";
import F03 from "./F03.ts";
import F04 from "./F04.ts";
import F05 from "./F05.ts";
import F06 from "./F06.ts";
import F07 from "./F07.ts";
import F08 from "./F08.ts";
import F09 from "./F09.ts";
import F10 from "./F10.ts";
import type { RowModule } from "./lib/row.ts";
import R01 from "./R01.ts";
import R02 from "./R02.ts";
import R03 from "./R03.ts";
import R04 from "./R04.ts";
import R05 from "./R05.ts";
import R06 from "./R06.ts";
import U02 from "./U02.ts";
import U03 from "./U03.ts";
import U04 from "./U04.ts";
import U05 from "./U05.ts";
import U06 from "./U06.ts";
import U07 from "./U07.ts";
import U08 from "./U08.ts";

export const ALL_ROWS: RowModule[] = [
	A01,
	A02,
	A03,
	A04,
	A05,
	A06,
	A07,
	A08,
	A09,
	A10,
	A11,
	A12,
	A13,
	A14,
	A15,
	A16,
	A17,
	A18,
	A19,
	A20,
	A21,
	A22,
	A23,
	A24,
	F01,
	F02,
	F03,
	F04,
	F05,
	F06,
	F07,
	F08,
	F09,
	F10,
	R01,
	R02,
	R03,
	R04,
	R05,
	R06,
	U02,
	U03,
	U04,
	U05,
	U06,
	U07,
	U08,
];

export function selectRows(ids: string[]): RowModule[] {
	return ids.map((id) => {
		const row = ALL_ROWS.find((r) => r.id === id.trim().toUpperCase());
		if (!row) throw new Error(`unknown acceptance ID ${id}`);
		return row;
	});
}
