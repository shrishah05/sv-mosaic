import { render, screen, waitFor } from "@testing-library/react";
import React, { act } from "react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import type { DrawersProps } from "@root/components/Drawers";

import Drawers from "@root/components/Drawers";
import testIds from "@root/utils/testIds";

const drawers = [{ title: "Drawer 1" }, { title: "Drawer 2" }];

async function setup(props: Partial<DrawersProps<(typeof drawers)[number]>> = {}) {
	const renderResult = await act(async () => render(
		<Drawers
			drawers={drawers}
			children={(drawer) => <>{drawer.title}</>}
			{...props}
		/>,
	));

	return {
		...renderResult,
		user: userEvent.setup(),
	};
}

describe(__dirname, () => {
	it("should render the drawers", async () => {
		await setup();

		expect(await screen.findByText("Drawer 1")).toBeInTheDocument();
		expect(await screen.findByText("Drawer 2")).toBeInTheDocument();
	});

	it("focuses the first heading after the drawer content renders", async () => {
		await setup({
			drawers: [drawers[0]],
			children: (drawer) => (
				<>
					<button>Before heading</button>
					<h1>{drawer.title}</h1>
				</>
			),
		});

		const heading = await screen.findByRole("heading", { name: "Drawer 1" });
		await waitFor(() => expect(heading).toHaveFocus());
		expect(heading.closest("[role='dialog']")).toHaveAttribute("aria-modal", "true");
	});

	it("focuses the first control when there is no heading", async () => {
		await setup({
			drawers: [drawers[0]],
			children: () => (
				<>
					<h2 hidden>Hidden heading</h2>
					<button disabled>Disabled</button>
					<button hidden>Hidden</button>
					<button>Available</button>
				</>
			),
		});

		await waitFor(() => expect(screen.getByRole("button", { name: "Available" })).toHaveFocus());
	});

	it("skips controls disabled by a fieldset", async () => {
		await setup({
			drawers: [drawers[0]],
			children: () => (
				<>
					<fieldset disabled>
						<input aria-label="Disabled input" />
					</fieldset>
					<button>Enabled control</button>
				</>
			),
		});

		await waitFor(() => expect(screen.getByRole("button", { name: "Enabled control" })).toHaveFocus());
	});

	it("does not re-include disabled controls with a tabindex", async () => {
		await setup({
			drawers: [drawers[0]],
			children: () => (
				<>
					<button disabled tabIndex={0}>Disabled</button>
					<button>Enabled control</button>
				</>
			),
		});

		await waitFor(() => expect(screen.getByRole("button", { name: "Enabled control" })).toHaveFocus());
	});

	it("focuses the dialog when it has no focusable content", async () => {
		await setup({ drawers: [drawers[0]] });

		const dialog = await screen.findByRole("dialog");
		await waitFor(() => expect(dialog).toHaveFocus());
		expect(dialog).toHaveAttribute("tabindex", "-1");
	});

	it("only focuses content in the topmost drawer", async () => {
		await setup({ children: (drawer) => <h2>{drawer.title}</h2> });

		await waitFor(() => expect(screen.getByRole("heading", { name: "Drawer 2" })).toHaveFocus());
		expect(screen.getByText("Drawer 1")).not.toHaveFocus();
	});

	it("does not steal focus when drawer content rerenders", async () => {
		const { rerender } = await setup({
			drawers: [drawers[0]],
			children: () => (
				<>
					<h2>Heading</h2>
					<button>Keep focus</button>
				</>
			),
		});
		const button = await screen.findByRole("button", { name: "Keep focus" });
		button.focus();

		rerender(
			<Drawers drawers={[drawers[0]]}>
				{() => (
					<>
						<h2>Updated heading</h2>
						<button>Keep focus</button>
					</>
				)}
			</Drawers>,
		);

		expect(button).toHaveFocus();
	});

	it("does not refocus when async content arrives after the dialog fallback", async () => {
		const { rerender } = await setup({ drawers: [drawers[0]] });
		const dialog = await screen.findByRole("dialog");
		await waitFor(() => expect(dialog).toHaveFocus());

		rerender(
			<Drawers drawers={[drawers[0]]}>
				{() => <button>Loaded control</button>}
			</Drawers>,
		);

		expect(await screen.findByRole("button", { name: "Loaded control" })).not.toHaveFocus();
		expect(dialog).toHaveFocus();
	});

	it("cancels queued focus when the drawers unmount", async () => {
		const frames = new Map<number, FrameRequestCallback>();
		let nextFrame = 1;
		const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			const id = nextFrame++;
			frames.set(id, callback);
			return id;
		});
		const cancelFrame = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
			frames.delete(id);
		});

		try {
			const { unmount } = await setup({
				drawers: [drawers[0]],
				children: () => <h1>Queued heading</h1>,
			});
			await screen.findByRole("heading", { name: "Queued heading" });
			await waitFor(() => expect(requestFrame).toHaveBeenCalled());
			const focusFrameId = nextFrame - 1;

			unmount();

			expect(cancelFrame).toHaveBeenCalledWith(focusFrameId);
			expect(frames.has(focusFrameId)).toBe(false);
		} finally {
			requestFrame.mockRestore();
			cancelFrame.mockRestore();
		}
	});

	it("should not render any draws if there are none defined", async () => {
		await setup({ drawers: [] });

		expect(screen.queryByTestId(testIds.DRAWER_BACKDROP)).toBeNull();
	});

	it("should begin closing a draw once the definition is removed", async () => {
		const { rerender } = await setup();

		const drawer1 = await screen.findByText("Drawer 1");
		const drawer2 = await screen.findByText("Drawer 2");

		expect(drawer1).toBeInTheDocument();
		expect(drawer2).toBeInTheDocument();

		rerender(
			<Drawers
				drawers={[drawers[0]]}
				children={(drawer) => <h3>{drawer.title}</h3>}
			/>,
		);

		expect(drawer1).toBeInTheDocument();
		expect(drawer2).toHaveClass("closing");
	});

	it("should remove the draw from the render entirely once the exiting animation has finished", async () => {
		const { rerender } = await setup();

		const drawer1 = await screen.findByText("Drawer 1");
		const drawer2 = await screen.findByText("Drawer 2");

		expect(drawer1).toBeInTheDocument();
		expect(drawer2).toBeInTheDocument();

		rerender(
			<Drawers
				drawers={[drawers[0]]}
				children={(drawer) => <h3>{drawer.title}</h3>}
			/>,
		);

		await waitFor(() => expect(screen.queryAllByTestId(testIds.DRAWER_BACKDROP)).toHaveLength(1));
	});

});
