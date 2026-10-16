/** Parse and validate SKILL.md against the open Agent Skills spec (plus optional lesson extras). */

function parseSkillMd(text) {
  const src = String(text ?? "").replace(/^\uFEFF/, "");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!m) {
    return { ok: false, error: "File must start with YAML frontmatter fenced by --- lines." };
  }
  const raw = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) {
      return { ok: false, error: "This checker only accepts single-line YAML keys (no nested maps)." };
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) {
      return { ok: false, error: "Each frontmatter line must be `key: value`." };
    }
    raw[kv[1]] = unquoteYamlScalar(kv[2]);
  }
  return { ok: true, fields: raw, body: m[2] ?? "" };
}

function unquoteYamlScalar(s) {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function specNameOk(name) {
  if (typeof name !== "string" || name.length < 1 || name.length > 64) return false;
  if (name.startsWith("-") || name.endsWith("-")) return false;
  if (name.includes("--")) return false;
  return /^[a-z0-9-]+$/.test(name);
}

function validateSkillMd(text, options) {
  const opts = options || {};
  const checks = [];
  const parsed = parseSkillMd(text);

  checks.push({
    id: "fence",
    pass: parsed.ok,
    label: parsed.ok
      ? "Frontmatter fenced with ---"
      : parsed.error,
  });
  if (!parsed.ok) return { ok: false, checks, parsed: null };

  const name = parsed.fields.name;
  const description = parsed.fields.description;
  const body = parsed.body;

  checks.push({
    id: "name-present",
    pass: typeof name === "string" && name.length > 0,
    label: "Required field `name` is present",
  });
  checks.push({
    id: "name-spec",
    pass: specNameOk(name || ""),
    label:
      "`name`: 1–64 chars, [a-z0-9-], no leading/trailing hyphen, no `--`",
  });
  if (opts.expectedName) {
    checks.push({
      id: "name-dir",
      pass: name === opts.expectedName,
      label: "`name` matches directory `" + opts.expectedName + "/`",
    });
  }
  const descOk =
    typeof description === "string" &&
    description.length >= 1 &&
    description.length <= 1024;
  checks.push({
    id: "desc-present",
    pass: descOk,
    label: "Required field `description` is 1–1024 characters",
  });
  if (opts.requireWhen) {
    checks.push({
      id: "desc-when",
      pass: descOk && /\bwhen\b/i.test(description),
      label: "`description` says when to use it (include the word “when”)",
    });
  }
  checks.push({
    id: "body",
    pass: body.trim().length > 0,
    label: "Markdown body after frontmatter is non-empty",
  });

  const hay = body.toLowerCase();
  for (const s of opts.requireSubstrings || []) {
    checks.push({
      id: "need:" + s,
      pass: hay.includes(String(s).toLowerCase()),
      label: "Body names tool `" + s + "`",
    });
  }
  for (const s of opts.forbidSubstrings || []) {
    const hit = hay.includes(String(s).toLowerCase());
    checks.push({
      id: "ban:" + s,
      pass: !hit,
      label: "Body does not tell the model to use `" + s + "`",
    });
  }

  return { ok: checks.every((c) => c.pass), checks, parsed };
}

function mountSkillEditor(root, options) {
  if (!root) return;
  const opts = options || {};
  root.innerHTML = "";

  const ta = document.createElement("textarea");
  ta.spellcheck = false;
  ta.setAttribute("aria-label", "SKILL.md editor");
  ta.value = opts.initial || "";

  const list = document.createElement("ul");
  list.className = "check-list";

  const status = document.createElement("p");
  status.className = "editor-status";

  function render() {
    const result = validateSkillMd(ta.value, opts);
    list.innerHTML = "";
    for (const c of result.checks) {
      const li = document.createElement("li");
      li.className = c.pass ? "pass" : "fail";
      li.textContent = (c.pass ? "Pass — " : "Fail — ") + c.label;
      list.appendChild(li);
    }
    status.textContent = result.ok
      ? "Spec-valid for this lesson. Keep the file; do not wire the harness yet."
      : "Fix every Fail line. Feedback is immediate — edit and this list updates.";
    status.className = "editor-status " + (result.ok ? "ok" : "bad");
  }

  ta.addEventListener("input", render);
  root.appendChild(ta);
  root.appendChild(list);
  root.appendChild(status);
  render();
}
