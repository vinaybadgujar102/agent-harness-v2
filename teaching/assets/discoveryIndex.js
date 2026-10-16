/** Check a Level-1 discovery index: metadata + paths, no skill bodies. */

function normalizeHay(s) {
  return String(s ?? "").toLowerCase();
}

function validateDiscoveryIndex(text, options) {
  const opts = options || {};
  const skills = opts.skills || [];
  const hay = String(text ?? "");
  const low = normalizeHay(hay);
  const checks = [];

  checks.push({
    id: "nonempty",
    pass: hay.trim().length > 0,
    label: "Index text is non-empty",
  });

  if (opts.requireReadFile) {
    checks.push({
      id: "read_file",
      pass: /\bread_file\b/.test(hay),
      label: "Tells the model to activate with `read_file`",
    });
  }

  for (const skill of skills) {
    checks.push({
      id: "name:" + skill.name,
      pass: hay.includes(skill.name),
      label: "Includes skill name `" + skill.name + "`",
    });
    checks.push({
      id: "desc:" + skill.name,
      pass: hay.includes(skill.description),
      label: "Includes full description for `" + skill.name + "`",
    });
    checks.push({
      id: "path:" + skill.name,
      pass: hay.includes(skill.path),
      label: "Includes path `" + skill.path + "`",
    });
    for (const leak of skill.leaks || []) {
      checks.push({
        id: "leak:" + leak.slice(0, 24),
        pass: !low.includes(normalizeHay(leak)),
        label: "Does not copy body text from `" + skill.name + "`",
      });
    }
  }

  return { ok: checks.every((c) => c.pass), checks };
}

function estimateTokens(s) {
  return Math.max(0, Math.round(String(s ?? "").length / 4));
}

function mountDiscoveryEditor(root, options) {
  if (!root) return;
  const opts = options || {};
  const dump = (opts.skills || [])
    .map(function (s) {
      return s.name + "\n" + s.description + "\n" + (s.body || "");
    })
    .join("\n\n");
  const dumpTokens = estimateTokens(dump);

  root.innerHTML = "";
  const ta = document.createElement("textarea");
  ta.spellcheck = false;
  ta.setAttribute("aria-label", "Discovery index editor");
  ta.value = opts.initial || "";

  const list = document.createElement("ul");
  list.className = "check-list";
  const status = document.createElement("p");
  status.className = "editor-status";

  function render() {
    const result = validateDiscoveryIndex(ta.value, opts);
    list.innerHTML = "";
    for (const c of result.checks) {
      const li = document.createElement("li");
      li.className = c.pass ? "pass" : "fail";
      li.textContent = (c.pass ? "Pass — " : "Fail — ") + c.label;
      list.appendChild(li);
    }
    const n = estimateTokens(ta.value);
    status.textContent = result.ok
      ? "Index is Level 1. ~" + n + " tokens vs ~" + dumpTokens + " if you dumped every body."
      : "Strip bodies. Keep name, description, path. ~" + n + " tokens now; dump would be ~" + dumpTokens + ".";
    status.className = "editor-status " + (result.ok ? "ok" : "bad");
  }

  ta.addEventListener("input", render);
  root.appendChild(ta);
  root.appendChild(list);
  root.appendChild(status);
  render();
}
