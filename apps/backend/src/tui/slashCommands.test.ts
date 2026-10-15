import { expect, test } from "bun:test";
import {
  filterSlashCommands,
  slashCommandForInput,
  slashMenuActive,
} from "./slashCommands";

test("slash menu when / prefix without spaces", () => {
  expect(slashMenuActive("/")).toBe(true);
  expect(slashMenuActive("/clear")).toBe(true);
  expect(slashMenuActive("/clear x")).toBe(false);
  expect(slashMenuActive("hello")).toBe(false);
});

test("filter slash commands by prefix", () => {
  expect(filterSlashCommands("/").map((c) => c.name)).toEqual([
    "/quit",
    "/new",
    "/clear",
    "/plan",
    "/agent",
    "/implement",
  ]);
  expect(filterSlashCommands("/q").map((c) => c.name)).toEqual(["/quit"]);
  expect(filterSlashCommands("/n").map((c) => c.name)).toEqual(["/new"]);
  expect(filterSlashCommands("/cl").map((c) => c.name)).toEqual(["/clear"]);
  expect(filterSlashCommands("/zzz")).toEqual([]);
});

test("new chat slash commands", () => {
  expect(slashCommandForInput("/new")?.action).toBe("new-chat");
  expect(slashCommandForInput("/clear")?.action).toBe("new-chat");
});

test("plan mode slash commands", () => {
  expect(slashCommandForInput("/plan")?.action).toBe("plan-mode");
  expect(slashCommandForInput("/agent")?.action).toBe("agent-mode");
  expect(slashCommandForInput("/implement")?.action).toBe("implement-plan");
});
