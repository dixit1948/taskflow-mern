import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../src/App";
import { AuthProvider } from "../src/context/AuthContext";
import { ToastProvider } from "../src/context/ToastContext";
import { ConfirmProvider } from "../src/components/Confirm";

const email = `ui${Date.now()}@test.com`;
const mount = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <ToastProvider><ConfirmProvider><AuthProvider><App /></AuthProvider></ConfirmProvider></ToastProvider>
    </MemoryRouter>
  );
const T = { timeout: 8000 };

describe("TaskFlow UI against live API", () => {
  it("full user journey", async () => {
    const user = userEvent.setup();
    mount();

    // 1. guarded route sends us to login
    expect(await screen.findByRole("heading", { name: "Welcome back" }, T)).toBeInTheDocument();

    // 2. go to register, check client-side validation
    await user.click(screen.getByRole("link", { name: "Create an account" }));
    expect(await screen.findByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "QA Tester");
    await user.type(screen.getByLabelText("Email"), email);
    await user.type(screen.getByLabelText("Password"), "weak");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use 8+ characters with a letter and a number")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // 3. dashboard
    expect(await screen.findByText(/Welcome back, QA/, {}, T)).toBeInTheDocument();
    expect(await screen.findByText("You're all caught up", {}, T)).toBeInTheDocument();
    expect(screen.getByText("Task Status")).toBeInTheDocument();

    // 4. smart quick add + live preview
    const input = screen.getByLabelText("Add a task");
    await user.type(input, "Pay rent tomorrow 5pm !high #bills");
    const preview = document.querySelector(".quick-chips");
    expect(within(preview).getByText("Pay rent")).toBeInTheDocument();
    expect(within(preview).getByText("High")).toBeInTheDocument();
    expect(within(preview).getByText("bills")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add task" }));
    const title = await screen.findByRole("heading", { name: "Pay rent" }, T);
    expect(title).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.queryByText("You're all caught up")).not.toBeInTheDocument();

    // 5. second task, then cycle status via the ring
    await user.type(input, "Buy milk{Enter}");
    await screen.findByRole("heading", { name: "Buy milk" }, T);
    const ring = screen.getAllByRole("button", { name: /Status: Not Started/ })[0];
    await user.click(ring);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Status: In Progress/ }).length).toBe(1), T);
    await user.click(screen.getAllByRole("button", { name: /Status: In Progress/ })[0]);
    // completed task moves to the Completed Task panel
    await waitFor(() => {
      const donePanel = screen.getByText("Completed Task").closest("section");
      expect(within(donePanel).getAllByRole("heading", { level: 3 }).length).toBe(1);
    }, T);

    // 6. edit modal
    await user.click(screen.getByRole("heading", { name: "Pay rent" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit task" });
    const titleInput = within(dialog).getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Pay rent online");
    await user.type(within(dialog).getByPlaceholderText("Add a step"), "Open banking app{Enter}");
    expect(within(dialog).getByDisplayValue("Open banking app")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Pay rent online" }, T)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("0/1", {}, T)).toBeInTheDocument(); // checklist chip

    // 7. trash with undo
    const card = screen.getByRole("heading", { name: "Pay rent online" }).closest("article");
    await user.click(within(card).getByRole("button", { name: "Task actions" }));
    await user.click(screen.getByRole("menuitem", { name: /Move to trash/ }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Pay rent online" })).not.toBeInTheDocument(), T);
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("heading", { name: "Pay rent online" }, T)).toBeInTheDocument();

    // 8. My Task page, board layout
    await user.click(screen.getAllByRole("link", { name: "My Task" })[0]);
    expect(await screen.findByRole("heading", { name: "My Task", level: 1 }, T)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Board" }));
    expect(await screen.findByRole("region", { name: "Not Started" }, T)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In Progress" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Completed" })).getByRole("heading", { name: "Buy milk" })).toBeInTheDocument();

    // 9. search filters
    await user.type(screen.getByLabelText("Search tasks"), "milk");
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Pay rent online" })).not.toBeInTheDocument(), T);
    expect(screen.getByRole("heading", { name: "Buy milk" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search tasks"));

    // 10. categories + settings + help render
    await user.click(screen.getByRole("link", { name: "Task Categories" }));
    expect(await screen.findByRole("link", { name: /bills/ }, T)).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "Settings" })[0]);
    expect(await screen.findByRole("heading", { name: "Settings", level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Help" }));
    expect(await screen.findByText("Quick add understands plain language")).toBeInTheDocument();

    // 11. logout, wrong login, right login
    await user.click(screen.getByRole("button", { name: /Logout/ }));
    expect(await screen.findByRole("heading", { name: "Welcome back" }, T)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), email);
    await user.type(screen.getByLabelText("Password"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Incorrect email or password", {}, T)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "password1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText(/Welcome back, QA/, {}, T)).toBeInTheDocument();
    // data persisted across sessions
    expect(await screen.findByRole("heading", { name: "Pay rent online" }, T)).toBeInTheDocument();
  });
});
