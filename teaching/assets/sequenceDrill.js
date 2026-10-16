/** Multi-step multiple choice. Wrong answers stay clickable until the correct one. */

function mountSequenceDrill(root, { title, steps, done }) {
  if (!root || !steps || !steps.length) return;
  let i = 0;

  function render() {
    root.innerHTML = "";
    const heading = document.createElement("p");
    heading.className = "quiz-question";
    if (i >= steps.length) {
      heading.textContent = done || "Sequence complete.";
      root.appendChild(heading);
      return;
    }
    const step = steps[i];
    heading.textContent =
      (title ? title + " · " : "") +
      "Step " +
      (i + 1) +
      " of " +
      steps.length +
      ". " +
      step.question;
    root.appendChild(heading);

    const opts = document.createElement("div");
    opts.className = "quiz-options";
    const feedback = document.createElement("p");
    feedback.className = "quiz-feedback";
    feedback.hidden = true;

    step.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        if (opt.correct) {
          for (const b of opts.querySelectorAll("button")) b.disabled = true;
          btn.classList.add("correct");
          feedback.hidden = false;
          feedback.textContent = opt.explain || step.explain || "Correct.";
          const next = document.createElement("button");
          next.type = "button";
          next.textContent = i + 1 < steps.length ? "Next step" : "Finish";
          next.addEventListener("click", () => {
            i += 1;
            render();
          });
          feedback.after(next);
        } else {
          btn.classList.add("wrong");
          btn.disabled = true;
          feedback.hidden = false;
          feedback.textContent = opt.explain || "Wrong. Pick another.";
        }
      });
      opts.appendChild(btn);
    });
    root.appendChild(opts);
    root.appendChild(feedback);
  }

  render();
}
